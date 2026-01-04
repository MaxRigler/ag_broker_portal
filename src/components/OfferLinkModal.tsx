import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/heaCalculator';

interface OfferLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerLink: string;
  maxInvestment: number;
  dealId: string | null;
}

export function OfferLinkModal({ open, onOpenChange, offerLink, maxInvestment, dealId }: OfferLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

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

  // Open Link just previews the link - status only updates via Everflow sync
  const handleOpenLink = () => {
    window.open(offerLink, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" hideCloseButton>
        <div className="space-y-4">
          {/* Header with checkmark */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-[hsl(var(--success))]" />
            <span className="text-lg font-bold text-[hsl(var(--success))]">Offer Link Generated</span>
          </div>

          {/* Two column layout for funding and payment */}
          <div className="flex gap-4">
            <div className="flex-[2]">
              <p className="text-xs text-foreground/70 font-medium mb-1">Maximum Funding</p>
              <p className="text-3xl md:text-4xl font-bold text-[hsl(var(--success))]">
                {formatCurrency(maxInvestment)}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-foreground/70 font-medium mb-1 whitespace-nowrap">Monthly Payment</p>
              <p className="text-xl md:text-2xl font-bold text-muted-foreground">
                $0.00
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">
            Send the following link to your client so they can fill out an application:
          </p>

          {/* Link input with copy button */}
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

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleOpenLink}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Link
            </Button>
            <Button variant="default" onClick={() => {
              onOpenChange(false);
              navigate('/pipeline');
            }}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

