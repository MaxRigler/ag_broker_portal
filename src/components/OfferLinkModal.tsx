import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface OfferLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerLink: string;
}

export function OfferLinkModal({ open, onOpenChange, offerLink }: OfferLinkModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(offerLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Offer Link Generated</DialogTitle>
          <DialogDescription>
            Send the following link to your client so they can fill out an application:
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <Input
            readOnly
            value={offerLink}
            className="flex-1 font-mono text-sm"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-[hsl(var(--success))]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
