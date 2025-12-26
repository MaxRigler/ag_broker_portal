import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardStep1 } from './WizardStep1';
import { WizardStep2 } from './WizardStep2';
import logo from '@/assets/logo-blue.png';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, LogOut, Columns3, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  full_name: string | null;
  company_name: string | null;
}

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

interface UnderwritingWizardProps {
  address: string;
  onBack: () => void;
}

type Step = 1 | 2;

interface WizardData {
  homeValue: number;
  state: string;
  mortgageBalance: number;
  maxInvestment: number;
  propertyType: string;
  ownershipType: string;
  currentCLTV: number;
  ownerNames: string[];
}

const steps = [
  { id: 1, title: 'Property Validation' },
  { id: 2, title: 'Payoff Estimator' },
];

export function UnderwritingWizard({ address, onBack }: UnderwritingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({});
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { user, signOut, userStatus, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setProfile(data);
        }
      }
    };

    fetchProfile();
  }, [user]);

  const handleStep1Complete = (data: { 
    homeValue: number; 
    state: string; 
    mortgageBalance: number; 
    maxInvestment: number;
    propertyType: string;
    ownershipType: string;
    currentCLTV: number;
    ownerNames: string[];
  }) => {
    setWizardData({ ...wizardData, ...data });
    setCurrentStep(2);
  };

  const handleReset = () => {
    setWizardData({});
    setCurrentStep(1);
    onBack();
  };

  const handleSignOut = async () => {
    await signOut();
    setIsPopoverOpen(false);
    onBack();
  };

  return (
    <section className="min-h-screen bg-background py-8 px-2 md:px-8 flex items-center justify-center relative overflow-hidden">
      {/* Background image layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('https://media-cldnry.s-nbcnews.com/image/upload/t_fit-1000w,f_auto,q_auto:best/rockcms/2025-06/250611-homes-suburbs-ch-1721-69f6cf.jpg')` }}
      />
      {/* White background overlay */}
      <div className="absolute inset-0 bg-white opacity-[0.97]" />
      
      {/* Content */}
      <div className="w-full max-w-4xl mx-auto px-2 md:px-12 relative z-10">
        {/* Header Row: Logo | Profile Widget (right-aligned) */}
        <div className="flex items-center justify-between mb-3 md:mb-5">
          {/* Left: Logo - aligned with content below */}
          <img 
            src={logo} 
            alt="Equity Advance" 
            className="h-10 md:h-16"
          />

          {/* Right: Profile Widget */}
          {user && profile && (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 h-auto py-2 px-3 hover:bg-muted/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="hidden md:flex flex-col items-start text-left">
                    <span className="text-sm font-semibold">{profile.full_name || 'Partner'}</span>
                    <span className="text-xs text-muted-foreground">{profile.company_name || 'Company'}</span>
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{profile.full_name || 'Partner'}</span>
                    <span className="text-xs text-muted-foreground">{profile.company_name || 'Company'}</span>
                  </div>
                </div>
                
                <Separator className="my-2" />
                
                <div className="py-2">
                  <p className="text-xs text-muted-foreground mb-1">Account Status</p>
                  {getStatusBadge(userStatus)}
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
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Wizard Content */}
        <div className="p-3 md:p-8">
            {currentStep === 1 && (
              <WizardStep1
                address={address}
                onComplete={handleStep1Complete}
                onBack={onBack}
              />
            )}
            {currentStep === 2 && wizardData.homeValue && wizardData.maxInvestment && (
              <WizardStep2
                address={address}
                homeValue={wizardData.homeValue}
                mortgageBalance={wizardData.mortgageBalance || 0}
                maxInvestment={wizardData.maxInvestment}
                state={wizardData.state || ''}
                propertyType={wizardData.propertyType || ''}
                ownershipType={wizardData.ownershipType || ''}
                currentCLTV={wizardData.currentCLTV || 0}
                ownerNames={wizardData.ownerNames}
                onBack={() => setCurrentStep(1)}
                onReset={handleReset}
              />
            )}
        </div>
      </div>
    </section>
  );
}
