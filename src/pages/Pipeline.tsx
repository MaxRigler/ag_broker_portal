import { useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PipelineColumn } from "@/components/pipeline/PipelineColumn";
import { usePipelineDeals, groupItemsByStage, PIPELINE_STAGES } from "@/hooks/usePipelineDeals";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";

export default function Pipeline() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { allItems, isLoading, error, syncDeals, isSyncing } = usePipelineDeals();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const groupedDeals = useMemo(() => groupItemsByStage(allItems), [allItems]);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Pipeline</h1>
              <p className="text-sm text-muted-foreground">
                Track deals across all stages
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncDeals()}
              disabled={isSyncing || isLoading}
              className="ml-4 gap-2"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isSyncing ? "Syncing..." : "Refresh Status"}
            </Button>
          </div>

          {/* Profile Button */}
          <UserMenu showArrow />
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
