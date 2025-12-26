import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DealCard } from "./DealCard";

interface Deal {
  id: string;
  created_at: string | null;
  property_address: string;
  owner_names: string[] | null;
  max_investment: number;
  everflow_event_status: string | null;
  originator_name: string | null;
  originator_role: string;
}

interface PipelineColumnProps {
  stageName: string;
  deals: Deal[];
}

export function PipelineColumn({ stageName, deals }: PipelineColumnProps) {
  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[280px] bg-muted/30 rounded-lg border border-border">
      <div className="p-3 border-b border-border bg-muted/50 rounded-t-lg">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium truncate" title={stageName}>
            {stageName}
          </h3>
          <Badge variant="secondary" className="shrink-0">
            {deals.length}
          </Badge>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {deals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No deals
            </p>
          ) : (
            deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
