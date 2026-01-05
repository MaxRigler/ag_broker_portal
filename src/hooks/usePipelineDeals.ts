import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PIPELINE_STAGES = [
  "Offer Generated",
  "Offer Link Clicked",
  "Application Created",
  "Application Qualified",
  "Estimate Prepared",
  "Application Completed",
  "Underwriting Submitted",
  "Review Requested",
  "Final Offer Presented",
  "Funds Disbursed",
  "Closed Lost",
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export interface Deal {
  id: string;
  created_at: string | null;
  property_address: string;
  owner_names: string[] | null;
  max_investment: number;
  everflow_event_status: string | null;
  originator_name: string | null;
  originator_role: string;
  offer_link: string | null;
  type: 'deal';
}

export interface CampaignLead {
  id: string;
  created_at: string | null;
  campaign_id: string;
  campaign_name: string;
  platform: string;
  everflow_event_status: string | null;
  click_timestamp: string | null;
  originator_name: string | null;
  originator_role: string;
  type: 'campaign_lead';
}

export type PipelineItem = Deal | CampaignLead;

export function usePipelineDeals() {
  const queryClient = useQueryClient();

  // Fetch property-based deals
  const dealsQuery = useQuery({
    queryKey: ["pipeline-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id, 
          created_at, 
          property_address, 
          owner_names, 
          max_investment, 
          everflow_event_status,
          offer_link,
          profiles!user_id (full_name, role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((deal: any) => ({
        id: deal.id,
        created_at: deal.created_at,
        property_address: deal.property_address,
        owner_names: deal.owner_names,
        max_investment: deal.max_investment,
        everflow_event_status: deal.everflow_event_status,
        originator_name: deal.profiles?.full_name || null,
        originator_role: deal.profiles?.role || 'manager',
        offer_link: deal.offer_link,
        type: 'deal' as const,
      })) as Deal[];
    },
  });

  // Fetch campaign leads
  // Note: campaign_leads table types will be available after running the migration and regenerating types
  const campaignLeadsQuery = useQuery({
    queryKey: ["pipeline-campaign-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("campaign_leads" as any)
        .select(`
          id,
          created_at,
          campaign_id,
          everflow_event_status,
          click_timestamp,
          campaigns!campaign_id (name, platform, user_id),
          profiles!user_id (full_name, role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((lead: any) => ({
        id: lead.id,
        created_at: lead.created_at,
        campaign_id: lead.campaign_id,
        campaign_name: lead.campaigns?.name || 'Unknown Campaign',
        platform: lead.campaigns?.platform || 'other',
        everflow_event_status: lead.everflow_event_status,
        click_timestamp: lead.click_timestamp,
        originator_name: lead.profiles?.full_name || null,
        originator_role: lead.profiles?.role || 'manager',
        type: 'campaign_lead' as const,
      })) as CampaignLead[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      // Trigger batch sync mode by sending empty body or specific mode flag
      const { data, error } = await supabase.functions.invoke('sync-everflow-status', {
        body: {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refetch both deals and campaign leads
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-campaign-leads"] });
    }
  });

  // Combine deals and campaign leads
  const allItems: PipelineItem[] = [
    ...(dealsQuery.data || []),
    ...(campaignLeadsQuery.data || [])
  ];

  return {
    data: dealsQuery.data, // Keep for backwards compatibility
    allItems, // Combined view
    campaignLeads: campaignLeadsQuery.data,
    isLoading: dealsQuery.isLoading || campaignLeadsQuery.isLoading,
    error: dealsQuery.error || campaignLeadsQuery.error,
    syncDeals: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending
  };
}

// Legacy function for backwards compatibility - groups only property deals
export function groupDealsByStage(deals: Deal[] | undefined) {
  const grouped: Record<PipelineStage, Deal[]> = {} as Record<PipelineStage, Deal[]>;

  // Initialize all stages with empty arrays
  PIPELINE_STAGES.forEach((stage) => {
    grouped[stage] = [];
  });

  // Group deals by their everflow_event_status
  deals?.forEach((deal) => {
    const status = deal.everflow_event_status as PipelineStage;
    if (status && PIPELINE_STAGES.includes(status)) {
      grouped[status].push(deal);
    } else {
      // Default to "Offer Generated" if status is null or unknown
      grouped["Offer Generated"].push(deal);
    }
  });

  return grouped;
}

// New function that groups all pipeline items (deals + campaign leads)
export function groupItemsByStage(items: PipelineItem[] | undefined) {
  const grouped: Record<PipelineStage, PipelineItem[]> = {} as Record<PipelineStage, PipelineItem[]>;

  // Initialize all stages with empty arrays
  PIPELINE_STAGES.forEach((stage) => {
    grouped[stage] = [];
  });

  // Group items by their everflow_event_status
  items?.forEach((item) => {
    const status = item.everflow_event_status as PipelineStage;
    if (status && PIPELINE_STAGES.includes(status)) {
      grouped[status].push(item);
    } else {
      // Default to "Offer Link Clicked" for campaign leads with null status, "Offer Generated" for deals
      const defaultStage = item.type === 'campaign_lead' ? "Offer Link Clicked" : "Offer Generated";
      grouped[defaultStage].push(item);
    }
  });

  return grouped;
}
