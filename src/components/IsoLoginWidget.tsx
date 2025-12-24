import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Briefcase, LogOut, User } from 'lucide-react';
import { IsoAuthModal } from './IsoAuthModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  full_name: string | null;
  company_name: string | null;
}

export function IsoLoginWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const location = useLocation();
  const { user, signOut } = useAuth();

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

  // Show user info when logged in
  if (user && profile) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
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
            <PopoverContent className="w-40 p-2" align="end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start"
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

  // Show login button when logged out
  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-lg sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>ISO Partner Login</DialogTitle>
            <DialogDescription>
              Login or create an account to access the ISO partner portal.
            </DialogDescription>
          </DialogHeader>
          <IsoAuthModal onLoginSuccess={handleLoginSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
