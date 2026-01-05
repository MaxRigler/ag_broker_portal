import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Loader2,
    ArrowLeft,
    Copy,
    Check,
    Plus,
    Megaphone,
    ExternalLink,
    TrendingUp,
    MousePointerClick,
    FileCheck,
    DollarSign,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserMenu } from '@/components/UserMenu';

// Platform configuration with icons and colors
const PLATFORMS = [
    { id: 'tiktok', name: 'TikTok', color: 'bg-black text-white', icon: '🎵' },
    { id: 'facebook', name: 'Facebook', color: 'bg-blue-600 text-white', icon: '📘' },
    { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white', icon: '📸' },
    { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-700 text-white', icon: '💼' },
    { id: 'twitter', name: 'X/Twitter', color: 'bg-black text-white', icon: '𝕏' },
    { id: 'youtube', name: 'YouTube', color: 'bg-red-600 text-white', icon: '▶️' },
    { id: 'email', name: 'Email', color: 'bg-green-600 text-white', icon: '📧' },
    { id: 'other', name: 'Other', color: 'bg-gray-600 text-white', icon: '🔗' },
];

interface Campaign {
    id: string;
    name: string;
    platform: string;
    description: string | null;
    offer_link: string;
    is_active: boolean;
    total_clicks: number;
    application_created: number;
    application_qualified: number;
    application_completed: number;
    funds_disbursed: number;
    created_at: string;
}

export default function CampaignsPage() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [campaignName, setCampaignName] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [description, setDescription] = useState('');

    // Copy state
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            fetchCampaigns();
        }
    }, [user]);

    const fetchCampaigns = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCampaigns(data || []);
        } catch (err) {
            console.error('Error fetching campaigns:', err);
            toast.error('Failed to load campaigns');
        } finally {
            setIsLoading(false);
        }
    };

    const getEverflowConfig = async () => {
        if (!user) return null;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, parent_id, everflow_encoded_value, everflow_tracking_domain')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            toast.error('Failed to fetch profile');
            return null;
        }

        let everflowData = {
            everflow_encoded_value: profile.everflow_encoded_value,
            everflow_tracking_domain: profile.everflow_tracking_domain,
            role: profile.role
        };

        // If officer, use parent's Everflow config
        if (profile.role === 'officer' && profile.parent_id) {
            const { data: parentProfile, error: parentError } = await supabase
                .from('profiles')
                .select('everflow_encoded_value, everflow_tracking_domain')
                .eq('id', profile.parent_id)
                .single();

            if (parentError || !parentProfile) {
                toast.error('Failed to fetch manager Everflow config');
                return null;
            }

            everflowData = {
                everflow_encoded_value: parentProfile.everflow_encoded_value,
                everflow_tracking_domain: parentProfile.everflow_tracking_domain,
                role: profile.role // Keep original role (officer)
            };
        }

        if (!everflowData.everflow_tracking_domain || !everflowData.everflow_encoded_value) {
            toast.error('Everflow tracking not configured. Contact support.');
            return null;
        }

        return everflowData;
    };

    const handleCreateCampaign = async () => {
        if (!campaignName.trim()) {
            toast.error('Please enter a campaign name');
            return;
        }
        if (!selectedPlatform) {
            toast.error('Please select a platform');
            return;
        }
        if (!user) return;

        setIsCreating(true);
        try {
            const everflowConfig = await getEverflowConfig();
            if (!everflowConfig) return;

            // Create campaign record first to get ID
            const { data: newCampaign, error: insertError } = await supabase
                .from('campaigns')
                .insert({
                    user_id: user.id,
                    name: campaignName.trim(),
                    platform: selectedPlatform,
                    description: description.trim() || null,
                    offer_link: 'pending' // Temporary, will update
                })
                .select('id')
                .single();

            if (insertError || !newCampaign) {
                throw new Error('Failed to create campaign');
            }

            // Generate offer link with sub4 for campaign tracking
            // Format: https://[tracking_domain]/[encoded_value]/[OFFER_HASH]/?sub4=[CAMPAIGN_ID]&sub3=[OFFICER_ID]
            const OFFER_HASH = '2CTPL';
            // Include sub3 (officer ID) only if user is an officer - enables granular tracking
            const sub3Param = everflowConfig.role === 'officer' ? `&sub3=${user.id}` : '';
            const offerLink = `https://${everflowConfig.everflow_tracking_domain}/${everflowConfig.everflow_encoded_value}/${OFFER_HASH}/?sub4=${newCampaign.id}${sub3Param}`;

            // Update campaign with the generated link
            const { error: updateError } = await supabase
                .from('campaigns')
                .update({ offer_link: offerLink })
                .eq('id', newCampaign.id);

            if (updateError) {
                throw new Error('Failed to save campaign link');
            }

            toast.success('Campaign created successfully!');

            // Reset form
            setCampaignName('');
            setSelectedPlatform('');
            setDescription('');

            // Refresh campaigns list
            fetchCampaigns();
        } catch (err) {
            console.error('Error creating campaign:', err);
            toast.error('Failed to create campaign');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopyLink = async (campaign: Campaign) => {
        try {
            await navigator.clipboard.writeText(campaign.offer_link);
            setCopiedId(campaign.id);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const handleSyncCampaigns = async () => {
        setIsSyncing(true);
        try {
            // Trigger the sync function with campaign mode
            const { error } = await supabase.functions.invoke('sync-everflow-status', {
                body: { mode: 'campaigns' }
            });

            if (error) throw error;

            toast.success('Campaign stats refreshed!');
            fetchCampaigns();
        } catch (err) {
            console.error('Sync error:', err);
            toast.error('Failed to sync campaign stats');
        } finally {
            setIsSyncing(false);
        }
    };

    const getPlatformConfig = (platformId: string) => {
        return PLATFORMS.find(p => p.id === platformId) || PLATFORMS[PLATFORMS.length - 1];
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold flex items-center gap-2">
                                <Megaphone className="h-5 w-5 text-primary" />
                                Campaigns
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Create trackable links for your marketing campaigns
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSyncCampaigns}
                            disabled={isSyncing || isLoading}
                            className="ml-4 gap-2"
                        >
                            {isSyncing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            {isSyncing ? 'Syncing...' : 'Refresh Stats'}
                        </Button>
                    </div>
                    <UserMenu showArrow />
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 p-4 max-w-6xl mx-auto w-full">
                <Tabs defaultValue="create" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="create" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Campaign
                        </TabsTrigger>
                        <TabsTrigger value="manage" className="gap-2">
                            <TrendingUp className="h-4 w-4" />
                            My Campaigns
                        </TabsTrigger>
                    </TabsList>

                    {/* Create Campaign Tab */}
                    <TabsContent value="create" className="mt-6">
                        <Card className="max-w-2xl">
                            <CardHeader>
                                <CardTitle>Create New Campaign</CardTitle>
                                <CardDescription>
                                    Generate a trackable affiliate link for your marketing campaign
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Campaign Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Campaign Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., Holiday TikTok Promo"
                                        value={campaignName}
                                        onChange={(e) => setCampaignName(e.target.value)}
                                        disabled={isCreating}
                                    />
                                </div>

                                {/* Platform Selection */}
                                <div className="space-y-2">
                                    <Label>Platform</Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {PLATFORMS.map((platform) => (
                                            <button
                                                key={platform.id}
                                                type="button"
                                                onClick={() => setSelectedPlatform(platform.id)}
                                                disabled={isCreating}
                                                className={`
                          p-3 rounded-lg border-2 transition-all text-center
                          ${selectedPlatform === platform.id
                                                        ? 'border-primary ring-2 ring-primary/20'
                                                        : 'border-border hover:border-muted-foreground/50'
                                                    }
                          ${isCreating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                                            >
                                                <span className="text-2xl block mb-1">{platform.icon}</span>
                                                <span className="text-xs font-medium">{platform.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description (Optional) */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Add notes about this campaign..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        disabled={isCreating}
                                        rows={3}
                                    />
                                </div>

                                {/* Create Button */}
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleCreateCampaign}
                                    disabled={isCreating || !campaignName.trim() || !selectedPlatform}
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Creating Campaign...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Campaign
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Manage Campaigns Tab */}
                    <TabsContent value="manage" className="mt-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : campaigns.length === 0 ? (
                            <Card className="p-8 text-center">
                                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
                                <p className="text-muted-foreground mb-4">
                                    Create your first campaign to start tracking leads from your marketing efforts.
                                </p>
                            </Card>
                        ) : (
                            <ScrollArea className="h-[calc(100vh-280px)]">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {campaigns.map((campaign) => {
                                        const platform = getPlatformConfig(campaign.platform);
                                        return (
                                            <Card key={campaign.id} className="relative overflow-hidden">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl">{platform.icon}</span>
                                                            <div>
                                                                <CardTitle className="text-base line-clamp-1">
                                                                    {campaign.name}
                                                                </CardTitle>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={`mt-1 ${platform.color} border-0`}
                                                                >
                                                                    {platform.name}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        {campaign.is_active ? (
                                                            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                                                                Active
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Inactive</Badge>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    {/* Stats Grid */}
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                                            <MousePointerClick className="h-4 w-4 text-blue-500" />
                                                            <div>
                                                                <p className="font-semibold">{campaign.total_clicks}</p>
                                                                <p className="text-xs text-muted-foreground">Clicks</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                                            <FileCheck className="h-4 w-4 text-amber-500" />
                                                            <div>
                                                                <p className="font-semibold">{campaign.application_created}</p>
                                                                <p className="text-xs text-muted-foreground">Apps</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                                            <TrendingUp className="h-4 w-4 text-purple-500" />
                                                            <div>
                                                                <p className="font-semibold">{campaign.application_completed}</p>
                                                                <p className="text-xs text-muted-foreground">Completed</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                                            <DollarSign className="h-4 w-4 text-emerald-500" />
                                                            <div>
                                                                <p className="font-semibold">{campaign.funds_disbursed}</p>
                                                                <p className="text-xs text-muted-foreground">Funded</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Copy Link Button */}
                                                    <Button
                                                        variant="outline"
                                                        className="w-full gap-2"
                                                        onClick={() => handleCopyLink(campaign)}
                                                    >
                                                        {copiedId === campaign.id ? (
                                                            <>
                                                                <Check className="h-4 w-4 text-emerald-500" />
                                                                Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-4 w-4" />
                                                                Copy Link
                                                            </>
                                                        )}
                                                    </Button>

                                                    {campaign.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            {campaign.description}
                                                        </p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
