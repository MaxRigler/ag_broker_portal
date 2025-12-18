import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Loader2, Home, MapPin, Building, User } from 'lucide-react';
import { ELIGIBLE_STATES, validateProperty, formatCurrency } from '@/lib/heaCalculator';

interface WizardStep1Props {
  address: string;
  onComplete: (data: { homeValue: number; state: string }) => void;
  onBack: () => void;
}

const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family (2-4 units)', 'Mobile Home', 'Commercial'];
const OWNERSHIP_TYPES = ['Personal', 'LLC', 'Corporation', 'Trust', 'Partnership'];

// Mock home values based on state
const MOCK_HOME_VALUES: Record<string, number> = {
  'CA': 950000,
  'FL': 520000,
  'TX': 380000,
  'AZ': 450000,
  'NV': 480000,
  'default': 800000
};

export function WizardStep1({ address, onComplete, onBack }: WizardStep1Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[] } | null>(null);
  const [homeValue, setHomeValue] = useState(0);

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
    }, 3000);

    return () => clearTimeout(timer);
  }, [address]);

  const handleHomeValueChange = (value: number) => {
    setHomeValue(value);
    setValidation(null); // Clear validation when value changes
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
      onComplete({ homeValue, state });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
        <Loader2 className="w-16 h-16 text-accent animate-spin mb-6" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Analyzing Property Data</h3>
        <p className="text-muted-foreground">Pulling information from real estate databases...</p>
        <p className="text-sm text-muted-foreground mt-2">{address}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Address Display */}
      <div className="p-4 bg-secondary rounded-lg flex items-start gap-3">
        <MapPin className="w-5 h-5 text-accent mt-0.5" />
        <div>
          <p className="text-sm text-muted-foreground">Property Address</p>
          <p className="font-medium text-foreground">{address}</p>
        </div>
      </div>

      {/* Property Details Form */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            State
          </Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {ELIGIBLE_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
              <SelectItem value="TX">TX (Not Eligible)</SelectItem>
              <SelectItem value="NY">NY (Not Eligible)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Property Type
          </Label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Ownership Type
          </Label>
          <Select value={ownershipType} onValueChange={setOwnershipType}>
            <SelectTrigger>
              <SelectValue placeholder="Select ownership" />
            </SelectTrigger>
            <SelectContent>
              {OWNERSHIP_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Estimated Home Value
            </Label>
            <Input
              type="text"
              value={formatCurrency(homeValue)}
              onChange={handleHomeValueInputChange}
              className="w-36 text-right font-bold text-accent"
            />
          </div>
          <Slider
            value={[homeValue]}
            onValueChange={(value) => handleHomeValueChange(value[0])}
            min={175000}
            max={3000000}
            step={10000}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(175000)}</span>
            <span>{formatCurrency(3000000)}</span>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className={`p-4 rounded-lg border ${validation.isValid ? 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30' : 'bg-destructive/10 border-destructive/30'}`}>
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
            <p className="text-sm text-[hsl(var(--success))] ml-7">
              Estimated Home Value: <span className="font-semibold">{formatCurrency(homeValue)}</span>
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        {!validation ? (
          <Button variant="blue" onClick={handleValidate} className="flex-1">
            Validate Property
          </Button>
        ) : validation.isValid ? (
          <Button variant="success" onClick={handleContinue} className="flex-1">
            Continue to Step 2
          </Button>
        ) : (
          <Button variant="blue" onClick={handleValidate} className="flex-1">
            Re-validate
          </Button>
        )}
      </div>
    </div>
  );
}
