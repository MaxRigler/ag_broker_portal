import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Briefcase, User } from 'lucide-react';
import { IsoAuthModal } from './IsoAuthModal';
import { useAuth } from '@/hooks/useAuth';
import { UserMenu } from "@/components/UserMenu";
// import { supabase } from '@/integrations/supabase/client';

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
  const [isWideModal, setIsWideModal] = useState(false);
  const [showPostSignupPending, setShowPostSignupPending] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, userStatus, userRole } = useAuth();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  /* Profile fetch logic removed - handled by UserMenu */
  /* getStatusBadge removed - handled by UserMenu */

  const handleLoginSuccess = () => {
    setIsOpen(false);
  };

  /* handleSignOut removed - handled by UserMenu */

  // If user is logged in and NOT showing post-signup pending modal, show user widget
  if (user && !showPostSignupPending) {
    return (
      <div className="fixed bottom-6 right-1/2 translate-x-1/2 md:right-6 md:translate-x-0 z-50">
        <div className="p-2 bg-card/10 backdrop-blur-sm rounded-xl border border-primary-foreground/10">
          <UserMenu variant="navy" size="lg" showArrow={true} />
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
