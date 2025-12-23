import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { CheckCircle2, XCircle, Loader2, MapPin, Building, User, Plus, Minus, AlertCircle, TrendingUp, X, DollarSign, Calendar, Calculator, Shield, RefreshCw, Home, Percent } from 'lucide-react';
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
  }) => void;
  onBack: () => void;
}

// All 50 states with full names and abbreviations
const ALL_STATES: { abbr: string; name: string }[] = [
  { abbr: 'AL', name: 'Alabama' }, { abbr: 'AK', name: 'Alaska' }, { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' }, { abbr: 'CA', name: 'California' }, { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' }, { abbr: 'DE', name: 'Delaware' }, { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' }, { abbr: 'HI', name: 'Hawaii' }, { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' }, { abbr: 'IN', name: 'Indiana' }, { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' }, { abbr: 'KY', name: 'Kentucky' }, { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' }, { abbr: 'MD', name: 'Maryland' }, { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' }, { abbr: 'MN', name: 'Minnesota' }, { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' }, { abbr: 'MT', name: 'Montana' }, { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' }, { abbr: 'NH', name: 'New Hampshire' }, { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' }, { abbr: 'NY', name: 'New York' }, { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' }, { abbr: 'OH', name: 'Ohio' }, { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' }, { abbr: 'PA', name: 'Pennsylvania' }, { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' }, { abbr: 'SD', name: 'South Dakota' }, { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' }, { abbr: 'UT', name: 'Utah' }, { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' }, { abbr: 'WA', name: 'Washington' }, { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' }, { abbr: 'WY', name: 'Wyoming' }, { abbr: 'DC', name: 'District of Columbia' }
];

// Property types matching RentCast values
const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Manufactured', 'Apartment', 'Land'];
const OWNERSHIP_TYPES = ['Personal', 'LLC', 'Corporation', 'Trust', 'Partnership'];

// Helper functions for eligibility
const isStateEligible = (abbr: string) => ELIGIBLE_STATES.includes(abbr);
const isPropertyTypeEligible = (type: string) => !INELIGIBLE_PROPERTY_TYPES.includes(type);
const isOwnershipTypeEligible = (type: string) => !INELIGIBLE_OWNERSHIP_TYPES.includes(type);
const getStateName = (abbr: string) => ALL_STATES.find(s => s.abbr === abbr)?.name || abbr;

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
  
  // Progressive disclosure state
  const [propertyDetailsConfirmed, setPropertyDetailsConfirmed] = useState(false);
  const [mortgageDetailsConfirmed, setMortgageDetailsConfirmed] = useState(false);
  
  // Payoff calculator state
  const [showPayoffCalculator, setShowPayoffCalculator] = useState(false);
  const [fundingAmount, setFundingAmount] = useState(15000);
  const [settlementYear, setSettlementYear] = useState(10);
  const [hpaRate, setHpaRate] = useState(3.0); // 3% default as percentage

  // CLTV calculations
  const currentCLTV = homeValue > 0 ? (mortgageBalance / homeValue) * 100 : 0;
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
        
        // Set state from RentCast
        setState(data.state);
        
        // Set property type from RentCast
        setPropertyType(data.propertyType);
        
        // Set home value from AVM
        const fetchedHomeValue = data.estimatedValue || 500000;
        setHomeValue(fetchedHomeValue);
        
        // Set default mortgage balance to 50% of home value
        setMortgageBalance(Math.round(fetchedHomeValue * 0.5));
        
        // Set property owner (exact title holder)
        setPropertyOwner(data.ownerNames);
        
        // Auto-detect ownership type from owner names
        const detectedOwnership = detectOwnershipType(data.ownerNames);
        setOwnershipType(detectedOwnership);
        
        // Auto-validate with fetched data
        const initialValidation = validateProperty(
          data.state, 
          data.propertyType, 
          detectedOwnership, 
          fetchedHomeValue
        );
        setValidation(initialValidation);
        
        toast.success('Property data loaded successfully');
      } catch (error) {
        console.error('Failed to fetch property data:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to fetch property data');
        toast.error('Failed to load property data');
        
        // Set default values on error
        setState('');
        setPropertyType('Single Family');
        setOwnershipType('Personal');
        setHomeValue(500000);
        setMortgageBalance(250000);
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
  };

  const handleHomeValueInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(value) || 175000;
    handleHomeValueChange(numValue);
  };

  const incrementValue = () => handleHomeValueChange(homeValue + 20000);
  const decrementValue = () => handleHomeValueChange(homeValue - 20000);

  const adjustMortgage = (amount: number) => {
    const newValue = Math.max(0, Math.min(mortgageBalance + amount, homeValue * 0.95));
    setMortgageBalance(newValue);
  };

  const handleMortgageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
    setMortgageBalance(Math.min(val, homeValue * 0.95));
  };

  // Handle CLTV slider change - updates mortgage balance based on CLTV percentage
  const handleCLTVSliderChange = (value: number[]) => {
    const newCLTV = value[0];
    const newMortgage = Math.round(homeValue * (newCLTV / 100));
    setMortgageBalance(newMortgage);
  };

  const handleValidate = () => {
    const result = validateProperty(state, propertyType, ownershipType, homeValue);
    setValidation(result);
  };

  const handleShowCalculator = () => {
    setShowPayoffCalculator(true);
  };

  const handleHideCalculator = () => {
    setShowPayoffCalculator(false);
  };

  const handleReset = () => {
    onBack();
  };

  // Funding amount controls
  const adjustFunding = (amount: number) => {
    const newValue = Math.max(15000, Math.min(fundingAmount + amount, maxInvestment));
    setFundingAmount(newValue);
  };

  const handleFundingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 15000;
    setFundingAmount(Math.max(15000, Math.min(val, maxInvestment)));
  };

  // Settlement year controls
  const adjustSettlementYear = (amount: number) => {
    const newValue = Math.max(1, Math.min(settlementYear + amount, 10));
    setSettlementYear(newValue);
  };

  // HPA rate controls
  const adjustHpaRate = (amount: number) => {
    const newValue = Math.max(-2, Math.min(hpaRate + amount, 6));
    setHpaRate(Math.round(newValue * 10) / 10);
  };

  const handleHpaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')) || 0;
    setHpaRate(Math.max(-2, Math.min(val, 6)));
  };

  if (isLoading) {
    return <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
        <Loader2 className="w-16 h-16 text-accent animate-spin mb-6" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Analyzing Property Data</h3>
        <p className="text-muted-foreground">Pulling information from RentCast...</p>
        <p className="text-sm text-muted-foreground mt-2">{address}</p>
      </div>;
  }

  return <div className="space-y-4">
      {/* Section Header */}
      <h2 className="text-lg md:text-xl font-bold text-foreground">
        {propertyDetailsConfirmed ? 'Property Details' : '1. Confirm Property Details'}
      </h2>

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

      {/* Desktop: 3-column grid (Value | Address | Owner) */}
      {/* Mobile: Stacked (Address/Owner, then Value centered) */}
      <div className="p-3 md:p-4 bg-secondary rounded-xl border border-border">
        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {/* Estimated Property Value - Left */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              {propertyDetailsConfirmed && (
                <Home className="w-5 h-5 text-accent" />
              )}
              <p className="text-sm text-muted-foreground font-medium">Estimated Property Value</p>
            </div>
            {propertyDetailsConfirmed ? (
              <p className="text-xl font-bold text-foreground">{formatCurrency(homeValue)}</p>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={decrementValue}
                  disabled={homeValue <= 175000}
                  className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="animate-breathe">
                  <Input 
                    type="text" 
                    value={formatCurrency(homeValue)} 
                    onChange={handleHomeValueInputChange} 
                    className="text-lg font-bold bg-background h-10 w-32 text-center" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={incrementValue}
                  disabled={homeValue >= 3000000}
                  className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Property Address - Middle */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Property Address</p>
              <p className="font-medium text-foreground text-sm">{address}</p>
            </div>
          </div>
          
          {/* Property Owner - Right */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Property Owner</p>
              <p className="font-medium text-foreground">{propertyOwner}</p>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-4">
          {/* Address & Owner stacked */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Property Address</p>
                <p className="font-medium text-foreground text-xs leading-tight">{address}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Property Owner</p>
                <p className="font-medium text-foreground text-sm">{propertyOwner}</p>
              </div>
            </div>
          </div>
          
          {/* Estimated Property Value centered */}
          <div className="flex flex-col items-center pt-2 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              {propertyDetailsConfirmed && (
                <Home className="w-4 h-4 text-accent" />
              )}
              <p className="text-sm text-muted-foreground font-medium">Estimated Property Value</p>
            </div>
            {propertyDetailsConfirmed ? (
              <p className="text-lg font-bold text-foreground">{formatCurrency(homeValue)}</p>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={decrementValue}
                  disabled={homeValue <= 175000}
                  className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="animate-breathe">
                  <Input 
                    type="text" 
                    value={formatCurrency(homeValue)} 
                    onChange={handleHomeValueInputChange} 
                    className="text-lg font-bold bg-background h-10 w-32 text-center" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={incrementValue}
                  disabled={homeValue >= 3000000}
                  className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dropdowns Row - Single row on mobile with abbreviated labels */}
      <div className="p-3 md:p-4 bg-secondary rounded-xl border border-border">
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="space-y-1 md:space-y-2">
            <Label className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <MapPin className="w-3 h-3 md:w-4 md:h-4 text-accent" />
              State
            </Label>
            {propertyDetailsConfirmed ? (
              <p className={`text-xs md:text-sm font-medium py-2 ${isStateEligible(state) ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                {getStateName(state)}
              </p>
            ) : (
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className={`bg-background text-xs md:text-sm h-9 md:h-10 ${state ? (isStateEligible(state) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive') : ''}`}>
                  <SelectValue placeholder="Select">{state ? state : 'Select'}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {ALL_STATES.map(s => (
                    <SelectItem 
                      key={s.abbr} 
                      value={s.abbr}
                      className={isStateEligible(s.abbr) ? 'text-[hsl(var(--success))]' : 'text-destructive'}
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1 md:space-y-2">
            <Label className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Building className="w-3 h-3 md:w-4 md:h-4 text-accent" />
              <span className="md:hidden">Property</span>
              <span className="hidden md:inline">Property Type</span>
            </Label>
            {propertyDetailsConfirmed ? (
              <p className={`text-xs md:text-sm font-medium py-2 ${isPropertyTypeEligible(propertyType) ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                {propertyType}
              </p>
            ) : (
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className={`bg-background text-xs md:text-sm h-9 md:h-10 ${propertyType ? (isPropertyTypeEligible(propertyType) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive') : ''}`}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(type => (
                    <SelectItem 
                      key={type} 
                      value={type}
                      className={isPropertyTypeEligible(type) ? 'text-[hsl(var(--success))]' : 'text-destructive'}
                    >
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1 md:space-y-2">
            <Label className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <User className="w-3 h-3 md:w-4 md:h-4 text-accent" />
              <span className="md:hidden">Ownership</span>
              <span className="hidden md:inline">Ownership Type</span>
            </Label>
            {propertyDetailsConfirmed ? (
              <p className={`text-xs md:text-sm font-medium py-2 ${isOwnershipTypeEligible(ownershipType) ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                {ownershipType}
              </p>
            ) : (
              <Select value={ownershipType} onValueChange={setOwnershipType}>
                <SelectTrigger className={`bg-background text-xs md:text-sm h-9 md:h-10 ${ownershipType ? (isOwnershipTypeEligible(ownershipType) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive') : ''}`}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {OWNERSHIP_TYPES.map(type => (
                    <SelectItem 
                      key={type} 
                      value={type}
                      className={isOwnershipTypeEligible(type) ? 'text-[hsl(var(--success))]' : 'text-destructive'}
                    >
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Sections shown after confirming property details */}
      {propertyDetailsConfirmed && (
        <div className="space-y-4 animate-fade-in">
          {/* Section Header for Mortgage */}
          <h2 className="text-lg md:text-xl font-bold text-foreground pt-2">
            {mortgageDetailsConfirmed ? 'Mortgage Details' : '2. Confirm Mortgage Details'}
          </h2>

          {mortgageDetailsConfirmed ? (
            /* Read-only Mortgage Summary after confirmation */
            <div className="p-4 bg-secondary rounded-xl border border-border">
              <div className="grid grid-cols-3 gap-4">
                {/* Outstanding Mortgage Balance */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-accent" />
                    <p className="text-xs md:text-sm text-muted-foreground font-medium">Outstanding Mortgage</p>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-foreground">{formatCurrency(mortgageBalance)}</p>
                </div>
                
                {/* Loan-to-Value */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="w-4 h-4 text-accent" />
                    <p className="text-xs md:text-sm text-muted-foreground font-medium">Loan-to-Value</p>
                  </div>
                  <p className={`text-lg md:text-xl font-bold ${currentCLTV > 80 ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
                    {currentCLTV.toFixed(1)}%
                  </p>
                </div>
                
                {/* Maximum Funding */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <p className="text-xs md:text-sm text-muted-foreground font-medium">Max Funding</p>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-[hsl(var(--success))]">{formatCurrency(maxInvestment)}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Editable Mortgage Section - Side by Side Layout */
            <>
              {/* Desktop: Side-by-side layout */}
              <div className="hidden md:block p-4 bg-secondary rounded-xl border border-border">
                <div className="grid grid-cols-2 gap-6">
                  {/* Outstanding Mortgage Balance - Left */}
                  <div className="flex flex-col items-center">
                    <p className="text-sm font-semibold text-foreground text-center mb-3">Outstanding Mortgage Balance</p>
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => adjustMortgage(-20000)}
                        disabled={mortgageBalance <= 0}
                        className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="animate-breathe">
                        <Input 
                          type="text" 
                          value={formatCurrency(mortgageBalance)} 
                          onChange={handleMortgageInputChange} 
                          className="text-xl font-bold bg-background h-12 w-36 text-center" 
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => adjustMortgage(20000)}
                        disabled={mortgageBalance >= homeValue * 0.95}
                        className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Combined Loan-to-Value (CLTV) Slider - Right */}
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-foreground text-center mb-3">Combined Loan-to-Value (CLTV)</p>
                    <div className="flex-1 flex flex-col justify-center">
                      {/* Slider with percentage on thumb */}
                      <div className="relative px-2 pt-8">
                        <Slider
                          value={[currentCLTV]}
                          onValueChange={handleCLTVSliderChange}
                          max={100}
                          min={0}
                          step={0.5}
                          className="w-full"
                        />
                        {/* Percentage badge that follows the slider thumb */}
                        <div 
                          className="absolute top-0 transform -translate-x-1/2 pointer-events-none"
                          style={{ left: `${Math.min(Math.max(currentCLTV, 8), 92)}%` }}
                        >
                          <Badge 
                            variant="outline" 
                            className={`text-sm font-bold px-2 py-0.5 ${currentCLTV > 80 ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-[hsl(var(--success))]'}`}
                          >
                            {currentCLTV.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      {/* Scale labels */}
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-2">
                        <span>0%</span>
                        <span className="text-destructive font-medium">80% Max</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile: Stacked layout */}
              <div className="md:hidden space-y-4">
                {/* Outstanding Mortgage Balance */}
                <div className="p-4 bg-secondary rounded-xl border border-border">
                  <p className="text-sm font-semibold text-foreground text-center mb-3">Outstanding Mortgage Balance</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => adjustMortgage(-20000)}
                      disabled={mortgageBalance <= 0}
                      className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="animate-breathe">
                      <Input 
                        type="text" 
                        value={formatCurrency(mortgageBalance)} 
                        onChange={handleMortgageInputChange} 
                        className="text-xl font-bold bg-background h-12 w-36 text-center" 
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => adjustMortgage(20000)}
                      disabled={mortgageBalance >= homeValue * 0.95}
                      className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* CLTV Slider */}
                <div className="p-4 bg-secondary rounded-xl border border-border">
                  <p className="text-sm font-semibold text-foreground text-center mb-4">Combined Loan-to-Value (CLTV)</p>
                  {/* Slider with percentage on thumb */}
                  <div className="relative px-2 pt-8">
                    <Slider
                      value={[currentCLTV]}
                      onValueChange={handleCLTVSliderChange}
                      max={100}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                    {/* Percentage badge that follows the slider thumb */}
                    <div 
                      className="absolute top-0 transform -translate-x-1/2 pointer-events-none"
                      style={{ left: `${Math.min(Math.max(currentCLTV, 8), 92)}%` }}
                    >
                      <Badge 
                        variant="outline" 
                        className={`text-sm font-bold px-2 py-0.5 ${currentCLTV > 80 ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-[hsl(var(--success))]'}`}
                      >
                        {currentCLTV.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  {/* Scale labels */}
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-2">
                    <span>0%</span>
                    <span className="text-destructive font-medium">80% Max</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Combined Results - Property Qualified + Maximum Funding - Only show after mortgage confirmed */}
          {mortgageDetailsConfirmed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Property Validation Status */}
            {validation ? (
              <div className={`p-4 rounded-xl border ${validation.isValid ? 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30' : 'bg-destructive/10 border-destructive/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {validation.isValid ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
                      <span className="font-semibold text-[hsl(var(--success))]">Property Qualified!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-destructive" />
                      <span className="font-semibold text-destructive">Property Does Not Qualify</span>
                    </>
                  )}
                </div>
                
                {/* Always show all 5 criteria with pass/fail status */}
                <ul className="space-y-1.5 ml-7 mt-2">
                  <li className={`flex items-center gap-2 text-sm ${isStateEligible(state) ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                    {isStateEligible(state) ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>Eligible State: <span className="font-semibold">{getStateName(state)}</span></span>
                  </li>
                  <li className={`flex items-center gap-2 text-sm ${isPropertyTypeEligible(propertyType) ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                    {isPropertyTypeEligible(propertyType) ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>Eligible Property Type: <span className="font-semibold">{propertyType}</span></span>
                  </li>
                  <li className={`flex items-center gap-2 text-sm ${isOwnershipTypeEligible(ownershipType) ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                    {isOwnershipTypeEligible(ownershipType) ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>Ownership Type: <span className="font-semibold">{ownershipType}</span></span>
                  </li>
                  <li className={`flex items-center gap-2 text-sm ${homeValue >= 175000 && homeValue <= 3000000 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                    {homeValue >= 175000 && homeValue <= 3000000 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>Home Value: <span className="font-semibold">{formatCurrency(homeValue)}</span></span>
                  </li>
                  <li className={`flex items-center gap-2 text-sm ${isCLTVEligible ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                    {isCLTVEligible ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>CLTV: <span className="font-semibold">{currentCLTV.toFixed(1)}%</span> {isCLTVEligible ? '(under 80% max)' : '(exceeds 80% max)'}</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border bg-secondary">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold text-muted-foreground">Validation Required</span>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  Click "Validate Property" to check eligibility
                </p>
              </div>
            )}

            {/* Maximum Potential Funding */}
            {validation?.isValid ? (
              isCLTVEligible ? (
                <div className="p-4 bg-secondary rounded-xl border border-accent/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    <span className="font-semibold text-foreground">Maximum Potential Funding</span>
                  </div>
                  <p className="text-4xl font-bold text-[hsl(var(--success))] mb-2">{formatCurrency(maxInvestment)}</p>
                  <p className="text-sm text-muted-foreground">
                    Based on 80% max CLTV, 30% max of home value, and $500K cap
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-secondary rounded-xl border border-destructive/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="font-semibold text-destructive">Does Not Qualify</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentCLTV > 80 
                      ? 'Current CLTV exceeds 80%. The client would need to pay down their mortgage to qualify.' 
                      : 'Available equity is too low for this program. Minimum funding is $15,000.'}
                  </p>
                </div>
              )
            ) : (
              <div className="p-4 bg-secondary rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold text-muted-foreground">Maximum Potential Funding</span>
                </div>
                <p className="text-2xl font-bold text-muted-foreground mb-2">—</p>
                <p className="text-sm text-muted-foreground">
                  Validate property to see funding amount
                </p>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* Settlement Estimator Section (shown when Calculate Cost of Funds is clicked) */}
      {showPayoffCalculator && (
        <div className="space-y-6 pt-4 border-t border-border">
          {/* Settlement Estimator Header */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Settlement Estimator</h3>
            <p className="text-sm text-muted-foreground">
              Adjust the funding amount, settlement year & annual appreciation percentage to estimate the cost of capital for your client
            </p>
          </div>

          {/* Three Variable Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Funding Amount */}
            <div className="p-4 bg-secondary rounded-xl border border-border overflow-hidden">
              <p className="text-sm font-semibold text-foreground text-center mb-3 flex items-center justify-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                Funding Amount
              </p>
              <div className="flex items-center justify-center gap-2 w-full">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => adjustFunding(-5000)}
                  disabled={fundingAmount <= 15000}
                  className="h-8 w-8 md:h-10 md:w-10 shrink-0 !rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Minus className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Input 
                  type="text" 
                  value={formatCurrency(fundingAmount)} 
                  onChange={handleFundingInputChange} 
                  className="text-base font-bold bg-background h-12 flex-1 min-w-[80px] max-w-[140px] text-center" 
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => adjustFunding(5000)}
                  disabled={fundingAmount >= maxInvestment}
                  className="h-8 w-8 md:h-10 md:w-10 shrink-0 !rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">$15K - {formatCurrency(maxInvestment)}</p>
            </div>

            {/* Settlement Year */}
            <div className="p-4 bg-secondary rounded-xl border border-border overflow-hidden">
              <p className="text-sm font-semibold text-foreground text-center mb-3 flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                Settlement Year
              </p>
              <div className="flex items-center justify-center gap-2 w-full">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => adjustSettlementYear(-1)}
                  disabled={settlementYear <= 1}
                  className="h-8 w-8 md:h-10 md:w-10 shrink-0 !rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Minus className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <div className="text-base font-bold bg-background h-12 flex-1 min-w-[80px] max-w-[140px] flex items-center justify-center border rounded-md whitespace-nowrap">
                  {settlementYear} {settlementYear === 1 ? 'Year' : 'Years'}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => adjustSettlementYear(1)}
                  disabled={settlementYear >= 10}
                  className="h-8 w-8 md:h-10 md:w-10 shrink-0 !rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">1 - 10 Years</p>
            </div>

            {/* Annual Appreciation */}
            <div className="p-4 bg-secondary rounded-xl border border-border overflow-hidden">
              <p className="text-sm font-semibold text-foreground text-center mb-3 flex items-center justify-center gap-2">
                <Home className="w-4 h-4 text-accent" />
                Annual Appreciation
              </p>
              <div className="flex items-center justify-center gap-2 w-full">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => adjustHpaRate(-0.5)}
                  disabled={hpaRate <= -2}
                  className="h-8 w-8 md:h-10 md:w-10 shrink-0 !rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Minus className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <Input 
                  type="text" 
                  value={`${hpaRate >= 0 ? '+' : ''}${hpaRate.toFixed(1)}%`} 
                  onChange={handleHpaInputChange} 
                  className={`text-base font-bold bg-background h-12 flex-1 min-w-[80px] max-w-[140px] text-center ${hpaRate >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => adjustHpaRate(0.5)}
                  disabled={hpaRate >= 6}
                  className="h-8 w-8 md:h-10 md:w-10 shrink-0 !rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">-2% to +6%</p>
            </div>
          </div>

          {/* Clarifying Agreement Structure Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Clarifying Agreement Structure</h3>
            </div>
            
            {/* Dynamic Intro Text */}
            <p className="text-sm text-muted-foreground text-center px-4">
              In exchange for {formatCurrency(fundingAmount)} in funding with no monthly payments, a lien will be recorded on the subject property securing a certain Equity Share Percentage in its future value at the time of settlement as demonstrated below.
            </p>

            {/* Visual Equation Display */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 py-4">
              {/* Ending Home Value Box */}
              <div className="p-4 bg-secondary rounded-xl border border-border text-center min-w-[160px]">
                <p className="text-xs text-muted-foreground mb-1">Ending Home Value</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(calculation.endingHomeValue)}</p>
              </div>
              
              {/* Multiplication Symbol */}
              <span className="text-2xl font-bold text-muted-foreground">×</span>
              
              {/* Equity Share % Box */}
              <div className="p-4 bg-secondary rounded-xl border border-border text-center min-w-[160px]">
                <p className="text-xs text-muted-foreground mb-1">Equity Share %</p>
                <p className="text-xl font-bold text-foreground">
                  {homeValue > 0 ? `${((fundingAmount / homeValue) * 2 * 100).toFixed(0)}%` : '0%'}
                </p>
              </div>
              
              {/* Equals Symbol */}
              <span className="text-2xl font-bold text-muted-foreground">=</span>
              
              {/* Total Cost of Capital Box */}
              <div className="p-4 bg-secondary rounded-xl border border-accent/30 text-center min-w-[160px]">
                <p className="text-xs text-muted-foreground mb-1">Total Cost of Capital</p>
                <p className="text-xl font-bold text-accent">{formatCurrency(calculation.totalCost)}</p>
              </div>
            </div>

            {/* Explanatory Text Block */}
            <div className="p-4 bg-secondary/50 rounded-xl border border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Settlement amount is calculated by multiplying the Equity Share Percentage with the Ending Home Value of the home. The equity share % will always be fixed for the duration of the agreement, however the ending home value may fluctuate due to market volatility, therefore the ending Settlement Amount is capped to ensure your client will never be charged an effective annualized rate that exceeds 19.9% resulting in the simulated outcome demonstrated below.
              </p>
            </div>

            {/* Two Result Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client's Share of Home After Settlement */}
              <div className="p-5 bg-[hsl(var(--success))]/10 rounded-xl border border-[hsl(var(--success))]/30">
                <p className="text-sm text-muted-foreground mb-2">Client's Share of Home After Settlement</p>
                <p className="text-3xl font-bold text-[hsl(var(--success))]">
                  {formatCurrency(calculation.endingHomeValue - calculation.payoff)}
                </p>
              </div>
              
              {/* Effective APR % */}
              <div className="p-5 bg-secondary rounded-xl border border-border">
                <p className="text-sm text-muted-foreground mb-2">Effective APR %</p>
                <p className="text-3xl font-bold text-foreground">{formatPercentage(calculation.apr)}</p>
              </div>
            </div>

            {/* Cost Cap Note (if applicable) */}
            {calculation.isCapped && (
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> The 19.9% annualized cost cap is protecting your client. 
                  Without the cap, the payoff would be {formatCurrency(calculation.rawUnlockShare)}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {showPayoffCalculator ? (
          <>
            <Button variant="outline" onClick={handleHideCalculator} className="flex-1">
              Back
            </Button>
            <Button variant="blue" onClick={handleReset} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              New Qualification
            </Button>
          </>
        ) : !propertyDetailsConfirmed ? (
          <>
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button variant="success" onClick={() => setPropertyDetailsConfirmed(true)} className="flex-1">
              Confirm Property Details
            </Button>
          </>
        ) : !mortgageDetailsConfirmed ? (
          <>
            <Button variant="outline" onClick={() => setPropertyDetailsConfirmed(false)} className="flex-1">
              Back
            </Button>
            <Button variant="success" onClick={() => setMortgageDetailsConfirmed(true)} className="flex-1">
              Confirm Mortgage Details
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setMortgageDetailsConfirmed(false)} className="flex-1">
              Back
            </Button>
            {!validation ? (
              <Button variant="blue" onClick={handleValidate} className="flex-1">
                Validate Property
              </Button>
            ) : isFullyEligible ? (
              <Button variant="success" onClick={handleShowCalculator} className="flex-1">
                Calculate Cost of Funds
              </Button>
            ) : (
              <Button variant="blue" onClick={handleValidate} className="flex-1">
                Re-validate
              </Button>
            )}
          </>
        )}
      </div>
    </div>;
}
