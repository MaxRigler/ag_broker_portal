import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, RefreshCw, Search, X } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PipelineColumn } from "@/components/pipeline/PipelineColumn";
import { usePipelineDeals, groupItemsByStage, PIPELINE_STAGES, PipelineItem, Deal, CampaignLead } from "@/hooks/usePipelineDeals";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";

export default function Pipeline() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { allItems, isLoading, error, syncDeals, isSyncing } = usePipelineDeals();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;

    const query = searchQuery.toLowerCase().trim();
    return allItems.filter((item: PipelineItem) => {
      if (item.type === 'deal') {
        const deal = item as Deal;
        // Search by property address
        if (deal.property_address?.toLowerCase().includes(query)) return true;
        // Search by owner/client names
        if (deal.owner_names?.some(name => name.toLowerCase().includes(query))) return true;
        // Search by originator name
        if (deal.originator_name?.toLowerCase().includes(query)) return true;
        return false;
      } else {
        const lead = item as CampaignLead;
        // Search by campaign name
        if (lead.campaign_name?.toLowerCase().includes(query)) return true;
        // Search by platform
        if (lead.platform?.toLowerCase().includes(query)) return true;
        // Search by originator name
        if (lead.originator_name?.toLowerCase().includes(query)) return true;
        return false;
      }
    });
  }, [allItems, searchQuery]);

  const groupedDeals = useMemo(() => groupItemsByStage(filteredItems), [filteredItems]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex flex-col gap-3 sm:gap-0">
          {/* Top row - Navigation and User Menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold">Pipeline</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Track deals across all stages
                </p>
              </div>
            </div>

            {/* Desktop-only: Refresh button and search bar */}
            <div className="hidden sm:flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncDeals()}
                disabled={isSyncing || isLoading}
                className="gap-2"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isSyncing ? "Syncing..." : "Refresh Status"}
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search clients, addresses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 w-[280px] h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <UserMenu showArrow />
            </div>

            {/* Mobile-only: User Menu */}
            <div className="sm:hidden">
              <UserMenu showArrow />
            </div>
          </div>

          {/* Mobile-only: Refresh button and Search bar row */}
          <div className="flex sm:hidden items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncDeals()}
              disabled={isSyncing || isLoading}
              className="gap-1.5 shrink-0"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden xs:inline">{isSyncing ? "Syncing..." : "Refresh"}</span>
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 w-full h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Pipeline Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-destructive">Failed to load deals. Please try again.</p>
          </div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="flex gap-4 pb-4 h-[calc(100vh-140px)]">
              {PIPELINE_STAGES.map((stage) => (
                <PipelineColumn
                  key={stage}
                  stageName={stage}
                  deals={groupedDeals[stage]}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
