import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Briefcase, LogOut, User } from 'lucide-react';
import { IsoAuthModal } from './IsoAuthModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  full_name: string | null;
  company_name: string | null;
}

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/20">Active</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20">Pending</Badge>;
    case 'denied':
      return <Badge className="bg-red-500/20 text-red-600 border-red-500/30 hover:bg-red-500/20">Denied</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

export function IsoLoginWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isWideModal, setIsWideModal] = useState(false);
  const [showPostSignupPending, setShowPostSignupPending] = useState(false);
  const location = useLocation();
  const { user, signOut, userStatus } = useAuth();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [user]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
  };

  const handleLoginSuccess = () => {
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    setIsPopoverOpen(false);
    await signOut();
  };

  // If user is logged in and NOT showing post-signup pending modal, show user widget
  if (user && !showPostSignupPending) {
    if (!profile) return null; // Don't show anything while profile is loading
    
    return (
      <div className="fixed bottom-6 right-1/2 translate-x-1/2 md:right-6 md:translate-x-0 z-50">
        <div className="p-2 bg-card/10 backdrop-blur-sm rounded-xl border border-primary-foreground/10">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="navy" size="lg">
                <User className="w-4 h-4" />
                <span className="flex flex-col items-start text-left leading-tight">
                  <span className="text-sm font-semibold">{profile.full_name || 'Partner'}</span>
                  <span className="text-xs opacity-80">{profile.company_name || 'Company'}</span>
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{profile.full_name || 'Partner'}</span>
                  <span className="text-xs text-muted-foreground">{profile.company_name || 'Company'}</span>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              <div className="py-2">
                <p className="text-xs text-muted-foreground mb-1">Account Status</p>
                {getStatusBadge(userStatus)}
              </div>
              
              <Separator className="my-2" />
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  // Only show login button when definitely logged out
  return (
    <>
      <div className="fixed bottom-6 right-1/2 translate-x-1/2 md:right-6 md:translate-x-0 z-50">
        <div className="p-2 bg-card/10 backdrop-blur-sm rounded-xl border border-primary-foreground/10">
          <Button 
            variant="navy"
            size="lg"
            onClick={() => setIsOpen(true)}
          >
            <Briefcase className="w-4 h-4" />
            ISO Login
          </Button>
        </div>
      </div>

      <Dialog open={isOpen || showPostSignupPending} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setIsWideModal(false);
          setShowPostSignupPending(false);
        }
      }}>
        <DialogContent className={`max-w-[calc(100%-2rem)] rounded-lg transition-all duration-300 ease-in-out ${isWideModal ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
          <DialogHeader className="sr-only">
            <DialogTitle>ISO Partner Login</DialogTitle>
            <DialogDescription>
              Login or create an account to access the ISO partner portal.
            </DialogDescription>
          </DialogHeader>
          <IsoAuthModal 
            onLoginSuccess={handleLoginSuccess} 
            onTabChange={(tab) => setIsWideModal(tab === 'signup')}
            onShowPending={() => setShowPostSignupPending(true)}
            initialView={showPostSignupPending ? 'account-pending' : 'login'}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
