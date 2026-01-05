import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, DollarSign, UserCheck, Link } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { memo } from "react";

interface DealCardProps {
  deal: {
    id: string;
    created_at: string | null;
    property_address: string;
    owner_names: string[] | null;
    max_investment: number;
    originator_name: string | null;
    originator_role: string;
    offer_link: string | null;
  };
  stageName?: string;
}

export const DealCard = memo(function DealCard({ deal, stageName }: DealCardProps) {
  const formattedDate = deal.created_at
    ? format(new Date(deal.created_at), "MMM d, yyyy")
    : "N/A";

  const ownerNamesDisplay = deal.owner_names?.length
    ? deal.owner_names.join(", ")
    : "N/A";

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(deal.max_investment);

  const handleCopyLink = async () => {
    if (deal.offer_link) {
      await navigator.clipboard.writeText(deal.offer_link);
      toast.success("Offer link copied to clipboard!");
    }
  };

  const showOfferLink = stageName === "Offer Generated" && deal.offer_link;

  return (
    <Card className="bg-card border border-border shadow-sm hover:shadow-md transition-shadow cursor-default">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
          {showOfferLink && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-primary hover:text-primary/80"
              onClick={handleCopyLink}
              title="Copy offer link"
            >
              <Link className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-sm font-medium leading-tight line-clamp-2">
            {deal.property_address}
          </p>
        </div>

        <div className="flex items-start gap-2">
          <User className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground line-clamp-1">
            {ownerNamesDisplay}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <UserCheck className="h-3 w-3 text-primary shrink-0" />
          <span className="text-xs text-foreground line-clamp-1">
            {deal.originator_name || "Unknown"}
          </span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">
            {deal.originator_role}
          </Badge>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <DollarSign className="h-3 w-3 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {formattedAmount}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});
