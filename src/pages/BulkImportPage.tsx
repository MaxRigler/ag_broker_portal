import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Loader2, CheckCircle2, XCircle, FileDown } from 'lucide-react';
import logo from '@/assets/logo-blue.png';
import { toast } from 'sonner';
import { UserMenu } from '@/components/UserMenu';
import { lookupProperty, detectOwnershipType } from '@/lib/api/atom';
import { validateProperty, calculateMaxInvestment, formatCurrency } from '@/lib/heaCalculator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ImportResult {
    id: string;
    address: string;
    status: 'pending' | 'processing' | 'success' | 'failed';
    message?: string;
    offerLink?: string;
    maxInvestment?: number;
}

export function BulkImportPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<ImportResult[]>([]);
    const [progress, setProgress] = useState(0);

    // Helper to get Everflow config
    const getEverflowConfig = async () => {
        if (!user) return null;

        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, parent_id, everflow_id, everflow_encoded_value, everflow_tracking_domain')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) {
            console.error('Error fetching profile:', profileError);
            return null;
        }

        let everflowData = {
            everflow_id: userProfile.everflow_id,
            everflow_encoded_value: userProfile.everflow_encoded_value,
            everflow_tracking_domain: userProfile.everflow_tracking_domain
        };

        // If user is an Officer, fetch Everflow data from parent profile
        if (userProfile.role === 'officer' && userProfile.parent_id) {
            const { data: parentProfile, error: parentError } = await supabase
                .from('profiles')
                .select('everflow_id, everflow_encoded_value, everflow_tracking_domain')
                .eq('id', userProfile.parent_id)
                .single();

            if (parentError || !parentProfile) {
                console.error('Error fetching parent profile:', parentError);
                return null;
            }

            everflowData = {
                everflow_id: parentProfile.everflow_id,
                everflow_encoded_value: parentProfile.everflow_encoded_value,
                everflow_tracking_domain: parentProfile.everflow_tracking_domain
            };
        }

        if (!everflowData.everflow_tracking_domain || !everflowData.everflow_encoded_value) {
            return null;
        }

        return everflowData;
    };

    const handleProcess = async () => {
        const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        if (lines.length === 0) {
            toast.error('Please enter at least one address');
            return;
        }

        if (lines.length > 50) {
            toast.error('Please limit to 50 addresses per batch');
            return;
        }

        if (!user) {
            toast.error('You must be logged in to process addresses');
            return;
        }

        const everflowConfig = await getEverflowConfig();
        if (!everflowConfig) {
            toast.error('Everflow configuration missing. Cannot generate links.');
            return;
        }

        setIsProcessing(true);
        // Initialize results
        const initialResults: ImportResult[] = lines.map((line, idx) => ({
            id: `job-${idx}-${Date.now()}`,
            address: line,
            status: 'pending'
        }));
        setResults(initialResults);

        let completedCount = 0;

        // Process sequentially to be safe
        for (let i = 0; i < initialResults.length; i++) {
            const currentItem = initialResults[i];

            // Update status to processing
            setResults(prev => prev.map(r => r.id === currentItem.id ? { ...r, status: 'processing' } : r));

            try {
                // 1. Lookup Property
                const propertyData = await lookupProperty(currentItem.address);

                // 2. Data Preparation
                const homeValue = propertyData.estimatedValue || 0;
                const mortgageBalance = propertyData.estimatedMortgageBalance > 0
                    ? propertyData.estimatedMortgageBalance
                    : Math.round(homeValue * 0.5); // Default to 50% if unknown, similar to Wizard logic

                const ownershipType = detectOwnershipType(propertyData.ownerNames);
                const validation = validateProperty(
                    propertyData.state,
                    propertyData.propertyType,
                    ownershipType,
                    homeValue
                );

                // 3. Logic Checks
                const maxInvestment = calculateMaxInvestment(homeValue, mortgageBalance);
                const currentCLTV = homeValue > 0 ? (mortgageBalance / homeValue) * 100 : 0;
                const isCLTVEligible = currentCLTV <= 80 && maxInvestment >= 15000;

                if (validation.isValid && isCLTVEligible) {
                    // 4. Create Deal
                    const { data: newDeal, error: dealError } = await supabase
                        .from('deals')
                        .insert({
                            user_id: user.id,
                            property_address: currentItem.address, // Use input address to match user expectation, or propertyData.address if preferred
                            home_value: homeValue,
                            mortgage_balance: mortgageBalance,
                            max_investment: maxInvestment,
                            owner_names: propertyData.ownerNames ? propertyData.ownerNames.split(',').map(n => n.trim()) : [],
                            everflow_event_status: 'pending'
                        })
                        .select('id')
                        .single();

                    if (dealError || !newDeal) {
                        throw new Error('Failed to create deal record');
                    }

                    // 5. Generate Link
                    const OFFER_HASH = '2CTPL';
                    const offerLink = `https://${everflowConfig.everflow_tracking_domain}/${everflowConfig.everflow_encoded_value}/${OFFER_HASH}/?sub5=${newDeal.id}`;

                    // Update Deal with Link
                    await supabase
                        .from('deals')
                        .update({ offer_link: offerLink })
                        .eq('id', newDeal.id);

                    // Success
                    setResults(prev => prev.map(r => r.id === currentItem.id ? {
                        ...r,
                        status: 'success',
                        offerLink,
                        message: `Max Funding: ${formatCurrency(maxInvestment)}`
                    } : r));

                } else {
                    // Validation Failed
                    const failureReasons = [
                        ...validation.errors,
                        !isCLTVEligible ? `LTV (${currentCLTV.toFixed(1)}%) too high or equity too low` : null
                    ].filter(Boolean).join(', ');

                    setResults(prev => prev.map(r => r.id === currentItem.id ? {
                        ...r,
                        status: 'failed',
                        message: failureReasons
                    } : r));
                }

            } catch (error) {
                console.error('Error processing address:', currentItem.address, error);
                setResults(prev => prev.map(r => r.id === currentItem.id ? {
                    ...r,
                    status: 'failed',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } : r));
            }

            completedCount++;
            setProgress(Math.round((completedCount / lines.length) * 100));

            // Small delay to prevent rate limit issues if necessary, though sequential is usually slow enough
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setIsProcessing(false);
        toast.success(`Batch processing complete. ${completedCount} addresses processed.`);
    };

    const handleExport = () => {
        if (results.length === 0) return;

        const csvContent = [
            ['Address', 'Status', 'Message', 'Offer Link'].join(','),
            ...results.map(r => [
                `"${r.address}"`,
                r.status,
                `"${r.message || ''}"`,
                r.offerLink || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bulk-import-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Reused Background from Wizard */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url('https://media-cldnry.s-nbcnews.com/image/upload/t_fit-1000w,f_auto,q_auto:best/rockcms/2025-06/250611-homes-suburbs-ch-1721-69f6cf.jpg')` }}
            />
            <div className="absolute inset-0 bg-white opacity-[0.97]" />

            <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/pipeline')}>
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <img src={logo} alt="Equity Advance" className="h-10 md:h-12" />
                    </div>
                    <UserMenu showArrow />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-6">Bulk Import</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Input Section */}
                    <div className="lg:col-span-1 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Import Addresses</CardTitle>
                                <CardDescription>
                                    Paste up to 50 addresses (one per line).<br />
                                    Format: Street, City, State Zip
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="123 Main St, Austin, TX 78701&#10;456 Oak Ave, Denver, CO 80203"
                                    className="min-h-[300px] font-mono text-sm"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={isProcessing}
                                />

                                <Button
                                    className="w-full"
                                    onClick={handleProcess}
                                    disabled={isProcessing || !input.trim()}
                                    variant="default"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing {progress}%
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Process Batch
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Results Section */}
                    <div className="lg:col-span-2">
                        <Card className="h-full flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Results</CardTitle>
                                    <CardDescription>Generated offers and eligibility status</CardDescription>
                                </div>
                                {results.length > 0 && !isProcessing && (
                                    <Button variant="outline" size="sm" onClick={handleExport}>
                                        <FileDown className="w-4 h-4 mr-2" />
                                        Export CSV
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="flex-1 overflow-auto max-h-[600px] p-0">
                                {results.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                                        <Upload className="w-12 h-12 mb-4 opacity-20" />
                                        <p>Enter addresses to start processing</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead>Address</TableHead>
                                                <TableHead className="w-[120px]">Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.map((result) => (
                                                <TableRow key={result.id}>
                                                    <TableCell className="font-medium text-xs md:text-sm truncate max-w-[200px]" title={result.address}>
                                                        {result.address}
                                                        {result.message && (
                                                            <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {result.status === 'success' && <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-500/20">Qualified</Badge>}
                                                        {result.status === 'failed' && <Badge variant="destructive" className="bg-red-500/15 text-red-600 hover:bg-red-500/25 border-red-500/20">Ineligible</Badge>}
                                                        {result.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                                                        {result.status === 'processing' && <Badge variant="outline" className="animate-pulse">Processing</Badge>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {result.offerLink && (
                                                            <a
                                                                href={result.offerLink}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-primary hover:underline text-xs"
                                                            >
                                                                View Link
                                                            </a>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
