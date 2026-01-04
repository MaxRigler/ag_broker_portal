import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Columns3, Users, LogOut, Upload, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserMenuProps {
    className?: string; // Additional classes for the trigger button
    showArrow?: boolean; // Whether to show the chevron arrow (default: true for internal pages)
    variant?: "ghost" | "navy"; // Style variant
    size?: "default" | "sm" | "lg" | "icon"; // Button size
}

export function UserMenu({ className, showArrow = true, variant = "ghost", size }: UserMenuProps) {
    const navigate = useNavigate();
    const { user, signOut, userStatus, userRole } = useAuth();
    const [profile, setProfile] = useState<{ full_name: string | null; company_name: string | null } | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('profiles')
                .select('full_name, company_name')
                .eq('id', user.id)
                .single();
            if (data) setProfile(data);
        };
        fetchProfile();
    }, [user]);

    const getStatusBadge = () => {
        switch (userStatus) {
            case 'active':
                return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
            case 'pending':
                return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>;
            case 'denied':
                return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Denied</Badge>;
            default:
                return null; // Or unknown badge
        }
    };

    if (!user) return null;

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={variant === "navy" ? "navy" : "ghost"}
                    size={size}
                    className={`flex items-center gap-2 ${className}`}
                >
                    {variant === "navy" ? (
                        <>
                            <User className="w-4 h-4" />
                            <span className="flex flex-col items-start text-left leading-tight">
                                <span className="text-sm font-semibold">{profile?.full_name || 'Partner'}</span>
                                <span className="text-xs opacity-80">{profile?.company_name || 'Company'}</span>
                            </span>
                        </>
                    ) : (
                        <>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                            </div>
                            <span className="hidden sm:inline text-sm font-medium">
                                {profile?.full_name || user.email?.split('@')[0]}
                            </span>
                        </>
                    )}

                    {showArrow && <ChevronDown className={`w-4 h-4 ${variant === "navy" ? "opacity-50" : "text-muted-foreground"}`} />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                            {profile?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {profile?.company_name || user.email}
                        </p>
                    </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-1 mb-2">
                    <p className="text-xs text-muted-foreground">Account Status</p>
                    {getStatusBadge()}
                </div>

                <Separator className="my-2" />

                <div className="flex flex-col gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                            setIsPopoverOpen(false);
                            navigate('/pipeline');
                        }}
                    >
                        <Columns3 className="w-4 h-4 mr-2" />
                        View Pipeline
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                            setIsPopoverOpen(false);
                            navigate('/bulk-import');
                        }}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Bulk Import
                    </Button>

                    {userRole === 'manager' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                                setIsPopoverOpen(false);
                                navigate('/team');
                            }}
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Manage Team
                        </Button>
                    )}
                </div>

                <Separator className="my-2" />

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                        setIsPopoverOpen(false);
                        signOut();
                    }}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </PopoverContent>
        </Popover>
    );
}
