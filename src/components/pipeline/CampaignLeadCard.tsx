import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { memo } from "react";

// Platform configuration with icons and colors
const PLATFORM_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
    tiktok: { name: 'TikTok', color: 'bg-black text-white', icon: '🎵' },
    facebook: { name: 'Facebook', color: 'bg-blue-600 text-white', icon: '📘' },
    instagram: { name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white', icon: '📷' },
    linkedin: { name: 'LinkedIn', color: 'bg-blue-700 text-white', icon: '💼' },
    twitter: { name: 'Twitter/X', color: 'bg-gray-900 text-white', icon: '𝕏' },
    email: { name: 'Email', color: 'bg-green-600 text-white', icon: '📧' },
    other: { name: 'Other', color: 'bg-gray-600 text-white', icon: '🔗' },
};

interface CampaignLeadCardProps {
    lead: {
        id: string;
        created_at: string | null;
        campaign_name: string;
        platform: string;
        click_timestamp: string | null;
        originator_name: string | null;
        originator_role: string;
    };
    stageName?: string;
}

export const CampaignLeadCard = memo(function CampaignLeadCard({ lead }: CampaignLeadCardProps) {
    const formattedDate = lead.click_timestamp
        ? format(new Date(lead.click_timestamp), "MMM d, yyyy")
        : lead.created_at
            ? format(new Date(lead.created_at), "MMM d, yyyy")
            : "N/A";

    const platformConfig = PLATFORM_CONFIG[lead.platform] || PLATFORM_CONFIG.other;

    return (
        <Card className="bg-card border border-border shadow-sm hover:shadow-md transition-shadow cursor-default border-l-4 border-l-primary/50">
            <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>{formattedDate}</span>
                    </div>
                    <Badge className={`${platformConfig.color} text-[10px] px-1.5 py-0 h-5`}>
                        <span className="mr-1">{platformConfig.icon}</span>
                        {platformConfig.name}
                    </Badge>
                </div>

                <div className="flex items-start gap-2">
                    <Users className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <p className="text-sm font-medium leading-tight">
                        Anonymous {platformConfig.name} Lead
                    </p>
                </div>

                <p className="text-xs text-muted-foreground pl-5 -mt-1 line-clamp-1">
                    via {lead.campaign_name}
                </p>

                <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <UserCheck className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-xs text-foreground line-clamp-1">
                        {lead.originator_name || "Unknown"}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">
                        {lead.originator_role}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
});
