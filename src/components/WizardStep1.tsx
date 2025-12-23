import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { CheckCircle2, XCircle, Loader2, MapPin, Building, User, AlertCircle, TrendingUp, X, DollarSign, Calendar, RefreshCw, Home, Percent } from 'lucide-react';
import { ELIGIBLE_STATES, INELIGIBLE_PROPERTY_TYPES, INELIGIBLE_OWNERSHIP_TYPES, validateProperty, formatCurrency, formatPercentage, calculateMaxInvestment, calculateHEACost } from '@/lib/heaCalculator';
import { lookupProperty, detectOwnershipType } from '@/lib/api/rentcast';
import { toast } from 'sonner';

interface WizardStep1Props {
  address: string;
  onComplete: (data: {
    homeValue: number;
    state: string;
    mortgageBalance: number;
    maxInvestment: number;
    propertyType: string;
    ownershipType: string;
    currentCLTV: number;
  }) => void;
  onBack: () => void;
}

// All 50 states with full names and abbreviations
const ALL_STATES: {
  abbr: string;
  name: string;
}[] = [{
  abbr: 'AL',
  name: 'Alabama'
}, {
  abbr: 'AK',
  name: 'Alaska'
}, {
  abbr: 'AZ',
  name: 'Arizona'
}, {
  abbr: 'AR',
  name: 'Arkansas'
}, {
  abbr: 'CA',
  name: 'California'
}, {
  abbr: 'CO',
  name: 'Colorado'
}, {
  abbr: 'CT',
  name: 'Connecticut'
}, {
  abbr: 'DE',
  name: 'Delaware'
}, {
  abbr: 'FL',
  name: 'Florida'
}, {
  abbr: 'GA',
  name: 'Georgia'
}, {
  abbr: 'HI',
  name: 'Hawaii'
}, {
  abbr: 'ID',
  name: 'Idaho'
}, {
  abbr: 'IL',
  name: 'Illinois'
}, {
  abbr: 'IN',
  name: 'Indiana'
}, {
  abbr: 'IA',
  name: 'Iowa'
}, {
  abbr: 'KS',
  name: 'Kansas'
}, {
  abbr: 'KY',
  name: 'Kentucky'
}, {
  abbr: 'LA',
  name: 'Louisiana'
}, {
  abbr: 'ME',
  name: 'Maine'
}, {
  abbr: 'MD',
  name: 'Maryland'
}, {
  abbr: 'MA',
  name: 'Massachusetts'
}, {
  abbr: 'MI',
  name: 'Michigan'
}, {
  abbr: 'MN',
  name: 'Minnesota'
}, {
  abbr: 'MS',
  name: 'Mississippi'
}, {
  abbr: 'MO',
  name: 'Missouri'
}, {
  abbr: 'MT',
  name: 'Montana'
}, {
  abbr: 'NE',
  name: 'Nebraska'
}, {
  abbr: 'NV',
  name: 'Nevada'
}, {
  abbr: 'NH',
  name: 'New Hampshire'
}, {
  abbr: 'NJ',
  name: 'New Jersey'
}, {
  abbr: 'NM',
  name: 'New Mexico'
}, {
  abbr: 'NY',
  name: 'New York'
}, {
  abbr: 'NC',
  name: 'North Carolina'
}, {
  abbr: 'ND',
  name: 'North Dakota'
}, {
  abbr: 'OH',
  name: 'Ohio'
}, {
  abbr: 'OK',
  name: 'Oklahoma'
}, {
  abbr: 'OR',
  name: 'Oregon'
}, {
  abbr: 'PA',
  name: 'Pennsylvania'
}, {
  abbr: 'RI',
  name: 'Rhode Island'
}, {
  abbr: 'SC',
  name: 'South Carolina'
}, {
  abbr: 'SD',
  name: 'South Dakota'
}, {
  abbr: 'TN',
  name: 'Tennessee'
}, {
  abbr: 'TX',
  name: 'Texas'
}, {
  abbr: 'UT',
  name: 'Utah'
}, {
  abbr: 'VT',
  name: 'Vermont'
}, {
  abbr: 'VA',
  name: 'Virginia'
}, {
  abbr: 'WA',
  name: 'Washington'
}, {
  abbr: 'WV',
  name: 'West Virginia'
}, {
  abbr: 'WI',
  name: 'Wisconsin'
}, {
  abbr: 'WY',
  name: 'Wyoming'
}, {
  abbr: 'DC',
  name: 'District of Columbia'
}];

// Property types matching RentCast values
const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Manufactured', 'Apartment', 'Land'];
const OWNERSHIP_TYPES = ['Personal', 'LLC', 'Corporation', 'Trust', 'Partnership'];

// Helper functions for eligibility
const isStateEligible = (abbr: string) => ELIGIBLE_STATES.includes(abbr);
const isPropertyTypeEligible = (type: string) => !INELIGIBLE_PROPERTY_TYPES.includes(type);
const isOwnershipTypeEligible = (type: string) => !INELIGIBLE_OWNERSHIP_TYPES.includes(type);
const getStateName = (abbr: string) => ALL_STATES.find(s => s.abbr === abbr)?.name || abbr;

// CLTV color helper: green < 75%, yellow 75-79.9%, red >= 80%
const getCLTVColorClass = (cltv: number, type: 'text' | 'badge') => {
  if (cltv >= 80) {
    return type === 'text' ? 'text-destructive' : 'bg-destructive text-destructive-foreground border-destructive';
  } else if (cltv >= 75) {
    return type === 'text' ? 'text-[hsl(var(--warning))]' : 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] border-[hsl(var(--warning))]';
  }
  return type === 'text' ? 'text-[hsl(var(--success))]' : 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-[hsl(var(--success))]';
};

export function WizardStep1({
  address,
  onComplete,
  onBack
}: WizardStep1Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [state, setState] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);
  const [homeValue, setHomeValue] = useState(0);
  const [propertyOwner, setPropertyOwner] = useState('');
  const [mortgageBalance, setMortgageBalance] = useState(0);

  // Payoff calculator state
  const [showPayoffCalculator, setShowPayoffCalculator] = useState(false);
  const [isHidingQualification, setIsHidingQualification] = useState(false);
  const [fundingAmount, setFundingAmount] = useState(15000);
  const [settlementYear, setSettlementYear] = useState(10);
  const [hpaRate, setHpaRate] = useState(3.0);

  // CLTV calculations
  const currentCLTV = homeValue > 0 ? mortgageBalance / homeValue * 100 : 0;
  const maxInvestment = calculateMaxInvestment(homeValue, mortgageBalance);
  const isCLTVEligible = currentCLTV <= 80 && maxInvestment >= 15000;
  const isFullyEligible = validation?.isValid && isCLTVEligible;

  // Update funding amount when maxInvestment changes
  useEffect(() => {
    if (maxInvestment > 0) {
      setFundingAmount(maxInvestment);
    }
  }, [maxInvestment]);

  // Payoff calculation
  const calculation = useMemo(() => {
    return calculateHEACost(fundingAmount, homeValue, settlementYear, hpaRate / 100);
  }, [fundingAmount, homeValue, settlementYear, hpaRate]);

  // Fetch property data from RentCast API
  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        setIsLoading(true);
        setApiError(null);
        const data = await lookupProperty(address);

        setState(data.state);
        setPropertyType(data.propertyType);
        const fetchedHomeValue = data.estimatedValue || 500000;
        setHomeValue(fetchedHomeValue);
        setMortgageBalance(0);
        setPropertyOwner(data.ownerNames);
        const detectedOwnership = detectOwnershipType(data.ownerNames);
        setOwnershipType(detectedOwnership);
        const initialValidation = validateProperty(data.state, data.propertyType, detectedOwnership, fetchedHomeValue);
        setValidation(initialValidation);
        toast.success('Property data loaded successfully');
      } catch (error) {
        console.error('Failed to fetch property data:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to fetch property data');
        toast.error('Failed to load property data');
        setState('');
        setPropertyType('Single Family');
        setOwnershipType('Personal');
        setHomeValue(500000);
        setMortgageBalance(0);
        setPropertyOwner('Unknown');
      } finally {
        setIsLoading(false);
      }
    };
    if (address) {
      fetchPropertyData();
    }
  }, [address]);

  // Auto-validate whenever key values change
  useEffect(() => {
    if (!isLoading && state && propertyType && ownershipType && homeValue >= 175000) {
      const result = validateProperty(state, propertyType, ownershipType, homeValue);
      setValidation(result);
    }
  }, [state, propertyType, ownershipType, homeValue, isLoading]);

  const handleHomeValueChange = (value: number) => {
    const clampedValue = Math.min(Math.max(value, 175000), 3000000);
    setHomeValue(clampedValue);
    // Clamp mortgage if it exceeds new home value
    if (mortgageBalance > clampedValue) {
      setMortgageBalance(clampedValue);
    }
  };

  const handleHomeValueInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(value) || 175000;
    handleHomeValueChange(numValue);
  };

  const handleMortgageChange = (value: number) => {
    const clampedValue = Math.min(Math.max(value, 0), homeValue);
    setMortgageBalance(clampedValue);
  };

  const handleMortgageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
    handleMortgageChange(val);
  };

  const handleShowCalculator = () => {
    setIsHidingQualification(true);
    setTimeout(() => {
      setShowPayoffCalculator(true);
    }, 300);
  };

  const handleHideCalculator = () => {
    setShowPayoffCalculator(false);
    setIsHidingQualification(false);
  };

  const handleReset = () => {
    onBack();
  };

  const handleConfirmProperty = () => {
    if (isFullyEligible) {
      onComplete({
        homeValue,
        state,
        mortgageBalance,
        maxInvestment,
        propertyType,
        ownershipType,
        currentCLTV
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
        <Loader2 className="w-16 h-16 text-accent animate-spin mb-6" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Analyzing Property Data</h3>
        <p className="text-muted-foreground">Pulling information from RentCast...</p>
        <p className="text-sm text-muted-foreground mt-2">{address}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* API Error Alert */}
      {apiError && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Failed to load property data</p>
            <p className="text-sm text-destructive/80">{apiError}</p>
            <p className="text-sm text-muted-foreground mt-1">Please verify the address or enter values manually below.</p>
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Two Column Sliders - Property Value & Mortgage Balance */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Confirm Property Value */}
          <div className="p-4 bg-secondary rounded-xl border border-border">
            <p className="text-sm font-semibold text-foreground text-center mb-4">Confirm Property Value</p>
            <div className="flex justify-center mb-4">
              <Input
                type="text"
                value={formatCurrency(homeValue)}
                onChange={handleHomeValueInputChange}
                className="text-2xl font-bold bg-background h-14 w-44 text-center border-2 border-accent"
              />
            </div>
            <div className="px-2">
              <Slider
                value={[homeValue]}
                onValueChange={(value) => handleHomeValueChange(value[0])}
                min={175000}
                max={3000000}
                step={20000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>$175K</span>
                <span>$3M</span>
              </div>
            </div>
          </div>

          {/* Confirm Mortgage Balance */}
          <div className="p-4 bg-secondary rounded-xl border border-border">
            <p className="text-sm font-semibold text-foreground text-center mb-4">Confirm Mortgage Balance</p>
            <div className="flex justify-center mb-4">
              <Input
                type="text"
                value={formatCurrency(mortgageBalance)}
                onChange={handleMortgageInputChange}
                className="text-2xl font-bold bg-background h-14 w-44 text-center border-2 border-accent"
              />
            </div>
            <div className="px-2">
              <Slider
                value={[mortgageBalance]}
                onValueChange={(value) => handleMortgageChange(value[0])}
                min={0}
                max={homeValue}
                step={10000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>$0</span>
                <span>{formatCurrency(homeValue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Property Details Section */}
        <div className="p-4 bg-secondary rounded-xl border border-border mb-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">Confirm Property Details</h3>
          
          {/* Top Row: State, Property Type, Ownership Type */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* State */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">State</p>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className={`bg-background text-sm h-10 ${state ? isStateEligible(state) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive' : ''}`}>
                    <SelectValue placeholder="Select">{state ? state : 'Select'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ALL_STATES.map(s => (
                      <SelectItem key={s.abbr} value={s.abbr} className={isStateEligible(s.abbr) ? 'text-[hsl(var(--success))]' : 'text-destructive'}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Property Type */}
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">Property Type</p>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className={`bg-background text-sm h-10 ${propertyType ? isPropertyTypeEligible(propertyType) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive' : ''}`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(type => (
                      <SelectItem key={type} value={type} className={isPropertyTypeEligible(type) ? 'text-[hsl(var(--success))]' : 'text-destructive'}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ownership Type */}
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">Ownership Type</p>
                <Select value={ownershipType} onValueChange={setOwnershipType}>
                  <SelectTrigger className={`bg-background text-sm h-10 ${ownershipType ? isOwnershipTypeEligible(ownershipType) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive' : ''}`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERSHIP_TYPES.map(type => (
                      <SelectItem key={type} value={type} className={isOwnershipTypeEligible(type) ? 'text-[hsl(var(--success))]' : 'text-destructive'}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Bottom Row: Property Address and Owner */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Property Address</p>
                <p className="font-medium text-foreground text-sm">{address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Property Owner</p>
                <p className="font-medium text-foreground">{propertyOwner}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-4">
        {/* Confirm Property Value Slider */}
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <p className="text-sm font-semibold text-foreground text-center mb-3">Confirm Property Value</p>
          <div className="flex justify-center mb-4">
            <Input
              type="text"
              value={formatCurrency(homeValue)}
              onChange={handleHomeValueInputChange}
              className="text-xl font-bold bg-background h-12 w-40 text-center border-2 border-accent"
            />
          </div>
          <div className="px-2">
            <Slider
              value={[homeValue]}
              onValueChange={(value) => handleHomeValueChange(value[0])}
              min={175000}
              max={3000000}
              step={20000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>$175K</span>
              <span>$3M</span>
            </div>
          </div>
        </div>

        {/* Confirm Mortgage Balance Slider */}
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <p className="text-sm font-semibold text-foreground text-center mb-3">Confirm Mortgage Balance</p>
          <div className="flex justify-center mb-4">
            <Input
              type="text"
              value={formatCurrency(mortgageBalance)}
              onChange={handleMortgageInputChange}
              className="text-xl font-bold bg-background h-12 w-40 text-center border-2 border-accent"
            />
          </div>
          <div className="px-2">
            <Slider
              value={[mortgageBalance]}
              onValueChange={(value) => handleMortgageChange(value[0])}
              min={0}
              max={homeValue}
              step={10000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>$0</span>
              <span>{formatCurrency(homeValue)}</span>
            </div>
          </div>
        </div>

        {/* Confirm Property Details Section - Mobile */}
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3 text-center">Confirm Property Details</h3>
          
          {/* Address & Owner Row */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Address</p>
                <p className="font-medium text-foreground text-xs leading-tight">{address}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Owner</p>
                <p className="font-medium text-foreground text-sm">{propertyOwner}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50 my-3"></div>

          {/* State, Property Type, Ownership Type */}
          <div className="flex gap-2">
            {/* State */}
            <div className="flex items-start gap-1 w-[70px]">
              <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">State</p>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className={`bg-background text-xs h-9 w-full ${state ? isStateEligible(state) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive' : ''}`}>
                    <SelectValue placeholder="Select">{state ? state : 'Select'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ALL_STATES.map(s => (
                      <SelectItem key={s.abbr} value={s.abbr} className={isStateEligible(s.abbr) ? 'text-[hsl(var(--success))]' : 'text-destructive'}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Property Type */}
            <div className="flex items-start gap-1 flex-1">
              <Building className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">Property</p>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className={`bg-background text-xs h-9 w-full ${propertyType ? isPropertyTypeEligible(propertyType) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive' : ''}`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(type => (
                      <SelectItem key={type} value={type} className={isPropertyTypeEligible(type) ? 'text-[hsl(var(--success))]' : 'text-destructive'}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ownership Type */}
            <div className="flex items-start gap-1 flex-1">
              <User className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">Ownership</p>
                <Select value={ownershipType} onValueChange={setOwnershipType}>
                  <SelectTrigger className={`bg-background text-xs h-9 w-full ${ownershipType ? isOwnershipTypeEligible(ownershipType) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive' : ''}`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERSHIP_TYPES.map(type => (
                      <SelectItem key={type} value={type} className={isOwnershipTypeEligible(type) ? 'text-[hsl(var(--success))]' : 'text-destructive'}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          variant="success" 
          onClick={handleConfirmProperty} 
          className="flex-1" 
          disabled={!isFullyEligible}
        >
          Confirm Property Details
        </Button>
      </div>
    </div>
  );
}
