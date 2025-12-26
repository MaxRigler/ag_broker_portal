import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, User, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface DealCardProps {
  deal: {
    id: string;
    created_at: string | null;
    property_address: string;
    owner_names: string[] | null;
    max_investment: number;
  };
}

export function DealCard({ deal }: DealCardProps) {
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

  return (
    <Card className="bg-card border border-border shadow-sm hover:shadow-md transition-shadow cursor-default">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formattedDate}</span>
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
        
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <DollarSign className="h-3 w-3 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {formattedAmount}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
