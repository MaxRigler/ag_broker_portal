import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Briefcase, LogOut, User, Building2 } from 'lucide-react';
import { IsoAuthModal } from './IsoAuthModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  full_name: string | null;
  company_name: string | null;
}

export function IsoLoginWidget() {
  const [isOpen, setIsOpen] = useState(false);
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
    await signOut();
  };

  // Show user info when logged in
  if (user && profile) {
    return (
      <div className="hidden md:block md:fixed md:bottom-6 md:right-6 z-50">
        <div className="p-4 bg-card/95 backdrop-blur-sm rounded-xl border border-border shadow-lg min-w-[200px]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {profile.full_name || 'Partner'}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{profile.company_name || 'Company'}</span>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // Show login button when logged out
  return (
    <>
      <div className="hidden md:block md:fixed md:bottom-6 md:right-6 z-50">
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
