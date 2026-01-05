import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { DealCard } from "./DealCard";
import { CampaignLeadCard } from "./CampaignLeadCard";
import type { PipelineItem, Deal, CampaignLead } from "@/hooks/usePipelineDeals";
import { useVirtualizer } from "@tanstack/react-virtual";

interface PipelineColumnProps {
  stageName: string;
  deals: PipelineItem[];
}

export function PipelineColumn({ stageName, deals }: PipelineColumnProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: deals.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // Approximate height of a card + margin
    overscan: 5,
  });

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

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto p-2"
        style={{
          // Ensure the scroll container has a relative position for absolute children if needed,
          // though typically the virtualizer handles the inner container's height.
        }}
      >
        {deals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No deals
          </p>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = deals[virtualRow.index];
              return (
                <div
                  key={item.id} // Virtualizer needs stable keys, use item ID
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute top-0 left-0 w-full px-1 pb-2" // Add padding to match previous layout
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {item.type === 'campaign_lead' ? (
                    <CampaignLeadCard lead={item as CampaignLead} stageName={stageName} />
                  ) : (
                    <DealCard deal={item as Deal} stageName={stageName} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
