import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Home, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency, calculateMaxInvestment } from '@/lib/heaCalculator';

interface WizardStep2Props {
  homeValue: number;
  onComplete: (data: { mortgageBalance: number; maxInvestment: number }) => void;
  onBack: () => void;
}

export function WizardStep2({ homeValue, onComplete, onBack }: WizardStep2Props) {
  const [mortgageBalance, setMortgageBalance] = useState(320000);
  
  const maxCLTV = homeValue * 0.8;
  const currentCLTV = (mortgageBalance / homeValue) * 100;
  const maxInvestment = calculateMaxInvestment(homeValue, mortgageBalance);
  const availableEquity = homeValue - mortgageBalance;
  const usableEquity = maxCLTV - mortgageBalance;

  const isEligible = currentCLTV <= 80 && maxInvestment >= 15000;

  const handleContinue = () => {
    if (isEligible) {
      onComplete({ mortgageBalance, maxInvestment });
    }
  };

  return (
    <div className="space-y-8">
      {/* Home Value Display */}
      <div className="p-4 bg-secondary rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="w-5 h-5 text-accent" />
            <span className="text-muted-foreground">Appraised Home Value</span>
          </div>
          <span className="text-2xl font-bold text-accent">{formatCurrency(homeValue)}</span>
        </div>
      </div>

      {/* Mortgage Balance Input */}
      <div className="space-y-4">
        <Label className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Outstanding Total Mortgage Balance
        </Label>
        <div className="flex gap-4 items-center">
          <Slider
            value={[mortgageBalance]}
            onValueChange={(value) => setMortgageBalance(value[0])}
            min={0}
            max={homeValue * 0.95}
            step={5000}
            className="flex-1"
          />
          <div className="w-36">
            <Input
              type="text"
              value={formatCurrency(mortgageBalance)}
              onChange={(e) => {
                const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                setMortgageBalance(Math.min(val, homeValue * 0.95));
              }}
              className="text-right font-semibold"
            />
          </div>
        </div>
      </div>

      {/* CLTV Visualization */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Combined Loan-to-Value (CLTV)</span>
          <span className={`font-semibold ${currentCLTV > 80 ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
            {currentCLTV.toFixed(1)}%
          </span>
        </div>
        <div className="h-4 bg-secondary rounded-full overflow-hidden relative">
          <div
            className={`h-full transition-all duration-300 ${currentCLTV > 80 ? 'bg-destructive' : 'bg-accent'}`}
            style={{ width: `${Math.min(currentCLTV, 100)}%` }}
          />
          <div className="absolute top-0 left-[80%] w-0.5 h-full bg-foreground/50" />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="text-foreground font-medium">80% Max CLTV</span>
          <span>100%</span>
        </div>
      </div>

      {/* Equity Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Total Equity</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(availableEquity)}</p>
        </div>
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Usable Equity (80% CLTV)</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(Math.max(0, usableEquity))}</p>
        </div>
      </div>

      {/* Maximum Investment Result */}
      {isEligible ? (
        <div className="p-6 bg-accent/10 border border-accent/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <span className="font-semibold text-foreground">Maximum Potential Funding</span>
          </div>
          <p className="text-4xl font-bold text-accent mb-2">{formatCurrency(maxInvestment)}</p>
          <p className="text-sm text-muted-foreground">
            Based on 80% max CLTV, 30% max of home value, and $500K cap
          </p>
        </div>
      ) : (
        <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-xl">
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
      <div className="flex gap-3 pt-4">
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
