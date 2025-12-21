import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, AlertCircle, X, Minus, Plus } from 'lucide-react';
import { formatCurrency, calculateMaxInvestment } from '@/lib/heaCalculator';

interface WizardStep2Props {
  homeValue: number;
  onComplete: (data: {
    mortgageBalance: number;
    maxInvestment: number;
  }) => void;
  onBack: () => void;
}

export function WizardStep2({
  homeValue,
  onComplete,
  onBack
}: WizardStep2Props) {
  const [mortgageBalance, setMortgageBalance] = useState(320000);
  const maxCLTV = homeValue * 0.8;
  const currentCLTV = mortgageBalance / homeValue * 100;
  const maxInvestment = calculateMaxInvestment(homeValue, mortgageBalance);
  const isEligible = currentCLTV <= 80 && maxInvestment >= 15000;

  const adjustMortgage = (amount: number) => {
    const newValue = Math.max(0, Math.min(mortgageBalance + amount, homeValue * 0.95));
    setMortgageBalance(newValue);
  };

  const handleContinue = () => {
    if (isEligible) {
      onComplete({
        mortgageBalance,
        maxInvestment
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Row: Property Value and Outstanding Mortgage Balance */}
      <div className="grid grid-cols-2 gap-4">
        {/* Property Value */}
        <div className="p-6 bg-secondary rounded-xl border border-border">
          <p className="text-sm text-[hsl(var(--success))] mb-1">Property Value</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(homeValue)}</p>
        </div>
        
        {/* Outstanding Mortgage Balance with +/- buttons */}
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <p className="text-sm font-semibold text-foreground text-center mb-3">Outstanding Mortgage Balance</p>
          <div className="flex items-center justify-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => adjustMortgage(-5000)}
              disabled={mortgageBalance <= 0}
              className="h-10 w-10"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="animate-breathe">
              <Input 
                type="text" 
                value={formatCurrency(mortgageBalance)} 
                onChange={e => {
                  const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                  setMortgageBalance(Math.min(val, homeValue * 0.95));
                }} 
                className="text-2xl font-bold bg-background h-12 w-40 text-center" 
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => adjustMortgage(5000)}
              disabled={mortgageBalance >= homeValue * 0.95}
              className="h-10 w-10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* CLTV Section */}
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

      {/* Maximum Investment Result */}
      {isEligible ? (
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
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          variant={isEligible ? 'success' : 'secondary'} 
          onClick={handleContinue} 
          disabled={!isEligible} 
          className="flex-1"
        >
          Continue to Step 3
        </Button>
      </div>
    </div>
  );
}
