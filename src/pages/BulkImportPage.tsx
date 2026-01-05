import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Loader2, CheckCircle2, XCircle, FileDown, Copy, Check } from 'lucide-react';
import logo from '@/assets/logo-blue.png';
import { toast } from 'sonner';
import { UserMenu } from '@/components/UserMenu';
import { lookupProperty, detectOwnershipType } from '@/lib/api/atom';
import { validateProperty, calculateMaxInvestment, formatCurrency } from '@/lib/heaCalculator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface ImportResult {
    id: string;
    address: string;
    status: 'pending' | 'processing' | 'success' | 'failed';
    message?: string;
    offerLink?: string;
    maxInvestment?: number;
    dealId?: string;
}

interface Batch {
    id: string;
    created_at: string;
    total_count: number;
    success_count: number;
    failed_count: number;
    status: 'processing' | 'completed' | 'failed';
    profiles?: {
        email: string;
        full_name: string | null;
    };
}

export function BulkImportPage() {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<ImportResult[]>([]);
    const [progress, setProgress] = useState(0);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('new');

    const fetchBatches = useCallback(async () => {
        if (!user) return;

        let query = supabase
            .from('bulk_import_batches')
            .select(`
                *,
                profiles (
                    email,
                    full_name
                )
            `)
            .order('created_at', { ascending: false });

        // If NOT admin, filter to own batches explicitly to be safe, though RLS handles it.
        // But the previous code had .eq('user_id', user.id), so let's preserve that logic for non-admins
        if (!isAdmin) {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching batches:', error);
            return;
        }

        if (data) setBatches(data as Batch[]);
    }, [user, isAdmin]);

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    const loadBatchDetails = async (batchId: string) => {
        const { data } = await supabase
            .from('bulk_import_items')
            .select('*')
            .eq('batch_id', batchId)
            .order('created_at', { ascending: true }); // Process order usually

        if (data) {
            setResults(data.map(item => ({
                id: item.id,
                address: item.original_address,
                status: item.status, // Cast or ensure type match
                message: item.result_message || undefined,
                offerLink: item.offer_link || undefined,
                dealId: item.deal_id || undefined
            })) as ImportResult[]);
            setSelectedBatchId(batchId);
            // Switch to history tab view logic if needed, or maybe share the 'results' view
        }
    };

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
            everflow_tracking_domain: userProfile.everflow_tracking_domain,
            role: userProfile.role
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
                everflow_tracking_domain: parentProfile.everflow_tracking_domain,
                role: userProfile.role // Keep original role (officer)
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
        setSelectedBatchId(null); // Clear selected history batch

        // Create Batch Record
        const { data: batchData, error: batchError } = await supabase
            .from('bulk_import_batches')
            .insert({
                user_id: user.id,
                total_count: lines.length,
                status: 'processing'
            })
            .select()
            .single();

        if (batchError || !batchData) {
            console.error('Failed to create batch:', batchError);
            toast.error('Failed to start batch processing');
            setIsProcessing(false);
            return;
        }

        // Initialize items in DB and State
        const initialResults: ImportResult[] = [];

        // We'll insert items one by one or in bulk? 
        // For 50 items, bulk insert is better, but we need IDs back mapped to lines.
        // Let's do bulk insert.
        const itemsToInsert = lines.map(line => ({
            batch_id: batchData.id,
            original_address: line,
            status: 'pending'
        }));

        const { data: insertedItems, error: itemsError } = await supabase
            .from('bulk_import_items')
            .insert(itemsToInsert as unknown as never) // Type assertion due to manual type update
            .select();

        if (itemsError || !insertedItems) {
            console.error('Failed to create items:', itemsError);
            toast.error('Failed to initialize items');
            setIsProcessing(false);
            return;
        }

        const workingResults = insertedItems.map(item => ({
            id: item.id,
            address: item.original_address,
            status: 'pending' as const
        }));

        setResults(workingResults);

        let completedCount = 0;
        let successCount = 0;
        let failedCount = 0;

        // Process sequentially
        for (let i = 0; i < workingResults.length; i++) {
            const currentItem = workingResults[i];

            // Update status to processing (Local & DB)
            setResults(prev => prev.map(r => r.id === currentItem.id ? { ...r, status: 'processing' } : r));
            await supabase.from('bulk_import_items').update({ status: 'processing' } as never).eq('id', currentItem.id);

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
                    // Include sub3 (officer ID) only if user is an officer - enables granular tracking
                    const sub3Param = everflowConfig.role === 'officer' ? `&sub3=${user.id}` : '';
                    const offerLink = `https://${everflowConfig.everflow_tracking_domain}/${everflowConfig.everflow_encoded_value}/${OFFER_HASH}/?sub5=${newDeal.id}${sub3Param}`;

                    // Update Deal with Link
                    await supabase
                        .from('deals')
                        .update({ offer_link: offerLink })
                        .eq('id', newDeal.id);

                    // Success state update
                    setResults(prev => prev.map(r => r.id === currentItem.id ? {
                        ...r,
                        status: 'success',
                        offerLink,
                        message: `Max Funding: ${formatCurrency(maxInvestment)}`
                    } : r));

                    // DB Update Success
                    await supabase.from('bulk_import_items').update({
                        status: 'success',
                        deal_id: newDeal.id,
                        offer_link: offerLink,
                        result_message: `Max Funding: ${formatCurrency(maxInvestment)}`
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any).eq('id', currentItem.id);

                    successCount++;

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

                    // DB Update Failure
                    await supabase.from('bulk_import_items').update({
                        status: 'failed',
                        result_message: failureReasons
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any).eq('id', currentItem.id);

                    failedCount++;
                }

            } catch (error) {
                console.error('Error processing address:', currentItem.address, error);
                setResults(prev => prev.map(r => r.id === currentItem.id ? {
                    ...r,
                    status: 'failed',
                    message: error instanceof Error ? error.message : 'Unknown error'
                } : r));

                // DB Update Error
                await supabase.from('bulk_import_items').update({
                    status: 'failed',
                    result_message: error instanceof Error ? error.message : 'Unknown error'
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any).eq('id', currentItem.id);

                failedCount++;
            }

            completedCount++;
            setProgress(Math.round((completedCount / lines.length) * 100));

            // Small delay to prevent rate limit issues
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Finalize Batch
        await supabase.from('bulk_import_batches').update({
            status: 'completed',
            completed_count: completedCount,
            success_count: successCount,
            failed_count: failedCount
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).eq('id', batchData.id);

        setIsProcessing(false);
        toast.success(`Batch processing complete. ${completedCount} addresses processed.`);
        fetchBatches(); // Refresh history list
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
                <h1 className="text-2xl font-bold text-foreground mb-6">Bulk PreQual</h1>

                <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); if (val === 'new') { setResults([]); setSelectedBatchId(null); } }}>
                    <TabsList className="mb-6">
                        <TabsTrigger value="new">New Import</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="new" className="mt-0">
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

                            {/* Results Section (New) */}
                            <div className="lg:col-span-2">
                                <ImportResultsCard
                                    results={results}
                                    isProcessing={isProcessing}
                                    onExport={handleExport}
                                    title="Current Batch Results"
                                    emptyMessage="Enter addresses to start processing"
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* History List */}
                            <div className="lg:col-span-1">
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>Past Imports</CardTitle>
                                        <CardDescription>Select a batch to view details</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <ScrollArea className="h-[600px]">
                                            <div className="flex flex-col divide-y">
                                                {batches.length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">No history found</div>
                                                ) : (
                                                    batches.map(batch => (
                                                        <button
                                                            key={batch.id}
                                                            className={`flex flex-col items-start p-4 text-left hover:bg-accent/50 transition-colors ${selectedBatchId === batch.id ? 'bg-accent' : ''}`}
                                                            onClick={() => loadBatchDetails(batch.id)}
                                                        >
                                                            <div className="flex items-center justify-between w-full mb-1">
                                                                <span className="font-medium text-sm">
                                                                    {format(new Date(batch.created_at), 'MMM d, yyyy h:mm a')}
                                                                </span>
                                                                {batch.status === 'processing' && <Badge variant="outline" className="text-xs">Processing</Badge>}
                                                                {batch.status === 'failed' && <Badge variant="destructive" className="text-xs">Failed</Badge>}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {batch.total_count} addresses • {batch.success_count} qualified
                                                                {isAdmin && batch.profiles && (
                                                                    <div className="mt-1 text-primary/80 font-medium">
                                                                        By: {batch.profiles.full_name || batch.profiles.email}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Selected Batch Results */}
                            <div className="lg:col-span-2">
                                <ImportResultsCard
                                    results={results}
                                    isProcessing={false}
                                    onExport={handleExport}
                                    title="Batch Details"
                                    emptyMessage="Select a batch from the history list to view results"
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// Extracted Results Card Component
function ImportResultsCard({
    results,
    isProcessing,
    onExport,
    title,
    emptyMessage
}: {
    results: ImportResult[],
    isProcessing: boolean,
    onExport: () => void,
    title: string,
    emptyMessage: string
}) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>Generated offers and eligibility status</CardDescription>
                </div>
                {results.length > 0 && !isProcessing && (
                    <Button variant="outline" size="sm" onClick={onExport}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[600px] p-0">
                {results.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                        <Upload className="w-12 h-12 mb-4 opacity-20" />
                        <p>{emptyMessage}</p>
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
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="relative w-32 md:w-48">
                                                    <input
                                                        readOnly
                                                        value={result.offerLink}
                                                        className="h-8 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-xs shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                    />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 bg-gradient-to-l from-muted/50 via-muted/50 to-transparent pl-4 pointer-events-none">
                                                        {/* Fade out effect just for style */}
                                                    </div>
                                                </div>
                                                <CopyButton text={result.offerLink} />
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 lg:px-3 text-xs gap-2"
            onClick={handleCopy}
        >
            {copied ? (
                <>
                    <Check className="h-3 w-3" />
                    <span className="hidden sm:inline">Copied</span>
                </>
            ) : (
                <>
                    <Copy className="h-3 w-3" />
                    <span className="hidden sm:inline">Copy Link</span>
                </>
            )}
        </Button>
    );
}

