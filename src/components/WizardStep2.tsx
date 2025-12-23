import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Home, DollarSign, MapPin, ArrowLeft, Share2, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/heaCalculator';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { SettlementEstimator } from './SettlementEstimator';
import { triggerConfetti } from '@/components/ui/confetti';

interface WizardStep2Props {
  address: string;
  homeValue: number;
  mortgageBalance: number;
  maxInvestment: number;
  state: string;
  propertyType: string;
  ownershipType: string;
  currentCLTV: number;
  onBack: () => void;
  onReset: () => void;
}

// State abbreviation to full name mapping
const getStateName = (abbr: string) => {
  const states: Record<string, string> = {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NY': 'New York',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming',
    'DC': 'District of Columbia'
  };
  return states[abbr] || abbr;
};
export function WizardStep2({
  address,
  homeValue,
  mortgageBalance,
  maxInvestment,
  state,
  propertyType,
  ownershipType,
  currentCLTV,
  onBack,
  onReset
}: WizardStep2Props) {
  const isMobile = useIsMobile();
  const [showCalculator, setShowCalculator] = useState(false);
  const [fundingAmount, setFundingAmount] = useState(maxInvestment);
  const [settlementYear, setSettlementYear] = useState(10);
  const [hpaRate, setHpaRate] = useState(0.03);

  // Trigger confetti animation on mount (property pre-qualified)
  useEffect(() => {
    triggerConfetti();
  }, []);

  const handleCalculator = () => {
    setShowCalculator(true);
  };
  const handleGenerateOffers = () => {
    toast.info('Generate Offer Links coming soon');
  };
  return <div className="space-y-6">
      {/* Main Content - Two Column on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Pre-Qualified Funding Card */}
        <div className="p-6 bg-secondary rounded-xl border border-border">
          {/* Property Qualified Headline */}
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-[hsl(var(--success))]" />
            <span className="text-lg font-bold text-[hsl(var(--success))]">Property Pre-Qualified</span>
          </div>

          {/* Top Row: Two columns for funding and payment */}
          <div className="flex gap-4 mb-4">
            <div className="flex-[2]">
              <p className="text-xs text-muted-foreground font-medium mb-1">Maximum Funding</p>
              <p className="text-3xl md:text-4xl font-bold text-[hsl(var(--success))]">
                {formatCurrency(maxInvestment)}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground font-medium mb-1 whitespace-nowrap">Monthly Payment</p>
              <p className="text-xl md:text-2xl font-bold text-muted-foreground">
                $0.00
              </p>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-xs text-muted-foreground">
            Your client's {getStateName(state)} property may be approved for an Equity Advance of up to {formatCurrency(maxInvestment)} with no monthly payments for up to 10 years.
          </p>
        </div>

        {/* Right Column: Property Qualified Card - Shows on Desktop and Mobile */}
        <div className="p-6 bg-[hsl(var(--success))]/10 rounded-xl border border-[hsl(var(--success))]/30">
            
            {/* Qualification Criteria */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] flex-shrink-0" />
                <span className="text-sm text-foreground">Eligible State: {getStateName(state)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] flex-shrink-0" />
                <span className="text-sm text-foreground">Eligible Property Type: {propertyType}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] flex-shrink-0" />
                <span className="text-sm text-foreground">Ownership Type: {ownershipType}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] flex-shrink-0" />
                <span className="text-sm text-foreground">Home Value: {formatCurrency(homeValue)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] flex-shrink-0" />
                <span className="text-sm text-foreground">CLTV: {currentCLTV.toFixed(1)}% (under 80% max)</span>
              </div>
            </div>
          </div>
      </div>

      {/* Info Boxes Row */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {/* Property Address - Desktop Only */}
        {!isMobile && <div className="p-4 bg-secondary rounded-xl border border-border">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Property Address</p>
                <p className="text-sm font-bold text-foreground mt-1">{address}</p>
              </div>
            </div>
          </div>}
        
        {/* Estimated Property Value */}
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <div className="flex items-start gap-3">
            <Home className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Estimated Property Value</p>
              <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(homeValue)}</p>
            </div>
          </div>
        </div>
        
        {/* Mortgage */}
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Mortgage</p>
              <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(mortgageBalance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Left Group: Back + Calculator (1/3 width on desktop) */}
        <div className={`flex gap-3 ${isMobile ? '' : 'flex-1'}`}>
          <Button variant="outline" size="icon" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="blue" size="icon" onClick={handleCalculator} className="flex-shrink-0">
            <Calculator className="h-4 w-4 text-white" />
          </Button>
        </div>
        
        {/* Right: Generate Offer Link (2/3 width on desktop) */}
        <Button 
          variant="success" 
          onClick={handleGenerateOffers} 
          className={isMobile ? 'flex-1' : 'flex-[2]'}
        >
          Generate Offer Link
          <Share2 className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Settlement Estimator Modal */}
      <SettlementEstimator
        homeValue={homeValue}
        maxInvestment={maxInvestment}
        fundingAmount={fundingAmount}
        setFundingAmount={setFundingAmount}
        settlementYear={settlementYear}
        setSettlementYear={setSettlementYear}
        hpaRate={hpaRate}
        setHpaRate={setHpaRate}
        open={showCalculator}
        onOpenChange={setShowCalculator}
      />
    </div>;
}