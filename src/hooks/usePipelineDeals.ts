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

interface Deal {
  id: string;
  created_at: string | null;
  property_address: string;
  owner_names: string[] | null;
  max_investment: number;
  everflow_event_status: string | null;
  originator_name: string | null;
  originator_role: string;
  offer_link: string | null;
}

export function usePipelineDeals() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pipeline-deals"],
    queryFn: async () => {
      // RLS policy handles filtering based on user role
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

      // Transform data to flatten the profiles join
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
      })) as Deal[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (deals: Deal[]) => {
      if (!deals.length) return;

      // Sync in parallel
      const results = await Promise.allSettled(
        deals.map(async (deal) => {
          const { data, error } = await supabase.functions.invoke('sync-everflow-status', {
            body: { deal_id: deal.id }
          });
          if (error) throw error;
          return data;
        })
      );

      return results;
    },
    onSuccess: () => {
      // Refetch stats to update UI
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
    }
  });

  return { ...query, syncDeals: syncMutation.mutateAsync, isSyncing: syncMutation.isPending };
}

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
