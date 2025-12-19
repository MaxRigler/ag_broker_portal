import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Loader2, MapPin, Building, User } from 'lucide-react';
import { ELIGIBLE_STATES, INELIGIBLE_PROPERTY_TYPES, INELIGIBLE_OWNERSHIP_TYPES, validateProperty, formatCurrency } from '@/lib/heaCalculator';

interface WizardStep1Props {
  address: string;
  onComplete: (data: {
    homeValue: number;
    state: string;
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

const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family (2-4 units)', 'Mobile Home', 'Commercial'];
const OWNERSHIP_TYPES = ['Personal', 'LLC', 'Corporation', 'Trust', 'Partnership'];

// Helper functions for eligibility
const isStateEligible = (abbr: string) => ELIGIBLE_STATES.includes(abbr);
const isPropertyTypeEligible = (type: string) => !INELIGIBLE_PROPERTY_TYPES.includes(type);
const isOwnershipTypeEligible = (type: string) => !INELIGIBLE_OWNERSHIP_TYPES.includes(type);
const getStateName = (abbr: string) => ALL_STATES.find(s => s.abbr === abbr)?.name || abbr;

// Mock home values based on state
const MOCK_HOME_VALUES: Record<string, number> = {
  'CA': 950000,
  'FL': 520000,
  'TX': 380000,
  'AZ': 450000,
  'NV': 480000,
  'default': 800000
};
export function WizardStep1({
  address,
  onComplete,
  onBack
}: WizardStep1Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);
  const [homeValue, setHomeValue] = useState(0);
  const [propertyOwner, setPropertyOwner] = useState('');

  // Simulate API data fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Mock detected values from address
      const detectedState = 'CA';
      setState(detectedState);
      setPropertyType('Single Family');
      setOwnershipType('Personal');
      setHomeValue(MOCK_HOME_VALUES[detectedState] || MOCK_HOME_VALUES.default);
      setPropertyOwner('Stacy & John Smith as community property');
    }, 3000);
    return () => clearTimeout(timer);
  }, [address]);
  const handleHomeValueChange = (value: number) => {
    setHomeValue(value);
    setValidation(null);
  };
  const handleHomeValueInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(value) || 175000;
    handleHomeValueChange(Math.min(Math.max(numValue, 175000), 3000000));
  };
  const handleValidate = () => {
    const result = validateProperty(state, propertyType, ownershipType, homeValue);
    setValidation(result);
  };
  const handleContinue = () => {
    if (validation?.isValid) {
      onComplete({
        homeValue,
        state
      });
    }
  };
  if (isLoading) {
    return <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
        <Loader2 className="w-16 h-16 text-accent animate-spin mb-6" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Analyzing Property Data</h3>
        <p className="text-muted-foreground">Pulling information from real estate databases...</p>
        <p className="text-sm text-muted-foreground mt-2">{address}</p>
      </div>;
  }
  return <div className="space-y-6">
      {/* Section 1: Estimated Property Value - Hero Section */}
      <div className="p-6 bg-gradient-to-br from-secondary to-accent/5 rounded-2xl border border-border">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-baseline gap-2 pt-6">
            <span className="text-lg font-semibold text-foreground">Step 1:</span>
            <span className="text-lg text-muted-foreground">Automated Property Value Estimation</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Estimated Value</span>
            <Input 
              type="text" 
              value={formatCurrency(homeValue)} 
              onChange={handleHomeValueInputChange} 
              className="w-44 h-12 text-center text-2xl font-bold text-accent border-2 border-accent/50 bg-background rounded-xl focus:border-accent focus:ring-0" 
            />
          </div>
        </div>
        
        {/* Slider */}
        <Slider value={[homeValue]} onValueChange={value => handleHomeValueChange(value[0])} min={175000} max={3000000} step={10000} className="mt-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{formatCurrency(175000)}</span>
          <span>{formatCurrency(3000000)}</span>
        </div>
      </div>

      {/* Section 2: Property Address & Property Owner */}
      <div className="p-5 bg-secondary rounded-xl border border-border">
        <div className="grid md:grid-cols-2 gap-6">
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

      {/* Section 3: Three Dropdowns in One Row */}
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

      {/* Validation Results */}
      {validation && <div className={`p-4 rounded-lg border ${validation.isValid ? 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {validation.isValid ? <>
                <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
                <span className="font-semibold text-[hsl(var(--success))]">Property Qualified!</span>
              </> : <>
                <XCircle className="w-5 h-5 text-destructive" />
                <span className="font-semibold text-destructive">Property Does Not Qualify</span>
              </>}
          </div>
          {validation.errors.length > 0 && <ul className="space-y-1 ml-7">
              {validation.errors.map((error, i) => <li key={i} className="text-sm text-destructive">{error}</li>)}
            </ul>}
          {validation.isValid && <p className="text-sm text-[hsl(var(--success))] ml-7">
              Estimated Home Value: <span className="font-semibold">{formatCurrency(homeValue)}</span>
            </p>}
        </div>}

      {/* Section 4: Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        {!validation ? <Button variant="blue" onClick={handleValidate} className="flex-1">
            Validate Property
          </Button> : validation.isValid ? <Button variant="success" onClick={handleContinue} className="flex-1">
            Continue to Step 2
          </Button> : <Button variant="blue" onClick={handleValidate} className="flex-1">
            Re-validate
          </Button>}
      </div>
    </div>;
}