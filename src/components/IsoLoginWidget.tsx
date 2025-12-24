import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Briefcase } from 'lucide-react';
import { IsoAuthModal } from './IsoAuthModal';

export function IsoLoginWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          variant="navyOutline"
          size="lg"
          onClick={() => setIsOpen(true)}
          className="bg-background shadow-lg hover:shadow-xl"
        >
          <Briefcase className="w-4 h-4" />
          ISO Login
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
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
