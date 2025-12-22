import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Loader2, MapPin, Building, User, Plus, Minus, AlertCircle, TrendingUp, X } from 'lucide-react';
import { ELIGIBLE_STATES, INELIGIBLE_PROPERTY_TYPES, INELIGIBLE_OWNERSHIP_TYPES, validateProperty, formatCurrency, calculateMaxInvestment } from '@/lib/heaCalculator';
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

  // CLTV calculations
  const currentCLTV = homeValue > 0 ? (mortgageBalance / homeValue) * 100 : 0;
  const maxInvestment = calculateMaxInvestment(homeValue, mortgageBalance);
  const isCLTVEligible = currentCLTV <= 80 && maxInvestment >= 15000;
  const isFullyEligible = validation?.isValid && isCLTVEligible;

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
        setOwnershipType(detectOwnershipType(data.ownerNames));
        
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

  const handleHomeValueChange = (value: number) => {
    const clampedValue = Math.min(Math.max(value, 175000), 3000000);
    setHomeValue(clampedValue);
    setValidation(null);
  };

  const handleHomeValueInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(value) || 175000;
    handleHomeValueChange(numValue);
  };

  const incrementValue = () => handleHomeValueChange(homeValue + 10000);
  const decrementValue = () => handleHomeValueChange(homeValue - 10000);

  const adjustMortgage = (amount: number) => {
    const newValue = Math.max(0, Math.min(mortgageBalance + amount, homeValue * 0.95));
    setMortgageBalance(newValue);
  };

  const handleMortgageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
    setMortgageBalance(Math.min(val, homeValue * 0.95));
  };

  const handleValidate = () => {
    const result = validateProperty(state, propertyType, ownershipType, homeValue);
    setValidation(result);
  };

  const handleContinue = () => {
    if (isFullyEligible) {
      onComplete({
        homeValue,
        state,
        mortgageBalance,
        maxInvestment
      });
    }
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

      {/* Row 1: Property Address & Property Owner */}
      <div className="p-3 md:p-4 bg-secondary rounded-xl border border-border">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Property Address</p>
              <p className="font-medium text-foreground">{address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Property Owner</p>
              <p className="font-medium text-foreground">{propertyOwner}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Three Dropdowns */}
      <div className="p-3 md:p-4 bg-secondary rounded-xl border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-accent" />
              State
            </Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className={`bg-background ${state ? (isStateEligible(state) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive') : ''}`}>
                <SelectValue placeholder="Select state">{state ? getStateName(state) : 'Select state'}</SelectValue>
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
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Building className="w-4 h-4 text-accent" />
              Property Type
            </Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className={`bg-background ${propertyType ? (isPropertyTypeEligible(propertyType) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive') : ''}`}>
                <SelectValue placeholder="Select type" />
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
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-accent" />
              Ownership Type
            </Label>
            <Select value={ownershipType} onValueChange={setOwnershipType}>
              <SelectTrigger className={`bg-background ${ownershipType ? (isOwnershipTypeEligible(ownershipType) ? 'border-[hsl(var(--success))] border-2 text-[hsl(var(--success))]' : 'border-destructive border-2 text-destructive') : ''}`}>
                <SelectValue placeholder="Select ownership" />
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
          </div>
        </div>
      </div>

      {/* Row 3: Estimated Property Value + Outstanding Mortgage Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Estimated Property Value */}
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <p className="text-sm font-semibold text-foreground text-center mb-3">Estimated Property Value</p>
          <div className="flex items-center justify-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={decrementValue}
              disabled={homeValue <= 175000}
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="animate-breathe">
              <Input 
                type="text" 
                value={formatCurrency(homeValue)} 
                onChange={handleHomeValueInputChange} 
                className="text-2xl font-bold bg-background h-12 w-40 text-center" 
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={incrementValue}
              disabled={homeValue >= 3000000}
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Outstanding Mortgage Balance */}
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <p className="text-sm font-semibold text-foreground text-center mb-3">Outstanding Mortgage Balance</p>
          <div className="flex items-center justify-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => adjustMortgage(-5000)}
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
                className="text-2xl font-bold bg-background h-12 w-40 text-center" 
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => adjustMortgage(5000)}
              disabled={mortgageBalance >= homeValue * 0.95}
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Row 4: CLTV Section */}
      <div className="p-4 bg-secondary rounded-xl border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-xs text-muted-foreground">Combined Loan-to-Value (CLTV)</p>
            <div className="h-3 bg-background rounded-full overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-300 ${currentCLTV > 80 ? 'bg-destructive' : 'bg-[hsl(var(--success))]'}`} 
                style={{ width: `${Math.min(currentCLTV, 100)}%` }} 
              />
              <div className="absolute top-1/2 left-[80%] -translate-x-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-destructive" strokeWidth={3} />
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>80% Max CLTV</span>
              <span>100%</span>
            </div>
          </div>
          <div className="ml-6 text-right">
            <span className={`text-3xl font-bold ${currentCLTV > 80 ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
              {currentCLTV.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Row 5: Combined Results - Property Qualified + Maximum Funding */}
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
            {validation.errors.length > 0 && (
              <ul className="space-y-1 ml-7">
                {validation.errors.map((error, i) => (
                  <li key={i} className="text-sm text-destructive">{error}</li>
                ))}
              </ul>
            )}
            {validation.isValid && (
              <ul className="space-y-1.5 ml-7 mt-2">
                <li className="flex items-center gap-2 text-sm text-[hsl(var(--success))]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Eligible State: <span className="font-semibold">{getStateName(state)}</span></span>
                </li>
                <li className="flex items-center gap-2 text-sm text-[hsl(var(--success))]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Eligible Property Type: <span className="font-semibold">{propertyType}</span></span>
                </li>
                <li className="flex items-center gap-2 text-sm text-[hsl(var(--success))]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Ownership Type: <span className="font-semibold">{ownershipType}</span></span>
                </li>
                <li className="flex items-center gap-2 text-sm text-[hsl(var(--success))]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Home Value: <span className="font-semibold">{formatCurrency(homeValue)}</span></span>
                </li>
                <li className="flex items-center gap-2 text-sm text-[hsl(var(--success))]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>CLTV: <span className="font-semibold">{currentCLTV.toFixed(1)}%</span> (under 80% max)</span>
                </li>
              </ul>
            )}
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

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        {!validation ? (
          <Button variant="blue" onClick={handleValidate} className="flex-1">
            Validate Property
          </Button>
        ) : isFullyEligible ? (
          <Button variant="success" onClick={handleContinue} className="flex-1">
            Continue to Step 2
          </Button>
        ) : (
          <Button variant="blue" onClick={handleValidate} className="flex-1">
            Re-validate
          </Button>
        )}
      </div>
    </div>;
}
