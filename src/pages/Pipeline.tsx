import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, User, Columns3, Users, LogOut, ChevronDown } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PipelineColumn } from "@/components/pipeline/PipelineColumn";
import { usePipelineDeals, groupDealsByStage, PIPELINE_STAGES } from "@/hooks/usePipelineDeals";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Pipeline() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut, userStatus, userRole } = useAuth();
  const { data: deals, isLoading, error } = usePipelineDeals();
  const [profile, setProfile] = useState<{ full_name: string | null; company_name: string | null } | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const getStatusBadge = () => {
    switch (userStatus) {
      case 'active':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>;
      case 'denied':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Denied</Badge>;
      default:
        return null;
    }
  };

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

  const groupedDeals = groupDealsByStage(deals);

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
          </div>

          {/* Profile Button */}
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {profile?.full_name || user.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile?.company_name || user.email}
                  </p>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              <div className="space-y-1 mb-2">
                <p className="text-xs text-muted-foreground">Account Status</p>
                {getStatusBadge()}
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex flex-col gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start bg-accent/50"
                  onClick={() => {
                    setIsPopoverOpen(false);
                    navigate('/pipeline');
                  }}
                >
                  <Columns3 className="w-4 h-4 mr-2" />
                  View Pipeline
                </Button>
                
                {userRole === 'manager' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      navigate('/team');
                    }}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Team
                  </Button>
                )}
              </div>
              
              <Separator className="my-2" />
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setIsPopoverOpen(false);
                  signOut();
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </PopoverContent>
          </Popover>
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
