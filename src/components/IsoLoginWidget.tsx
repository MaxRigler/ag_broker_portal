import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Briefcase } from 'lucide-react';
import { IsoAuthModal } from './IsoAuthModal';

export function IsoLoginWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

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
          <IsoAuthModal />
        </DialogContent>
      </Dialog>
    </>
  );
}
