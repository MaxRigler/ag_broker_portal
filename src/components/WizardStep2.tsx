import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { DollarSign, TrendingUp, AlertCircle, X } from 'lucide-react';
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
  const availableEquity = homeValue - mortgageBalance;
  const usableEquity = maxCLTV - mortgageBalance;
  const isEligible = currentCLTV <= 80 && maxInvestment >= 15000;

  const handleContinue = () => {
    if (isEligible) {
      onComplete({
        mortgageBalance,
        maxInvestment
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Row: Property Value, Total Equity, Usable Equity */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-accent rounded-xl">
          <p className="text-xs text-accent-foreground/70 mb-1">Property Value</p>
          <p className="text-xl font-bold text-accent-foreground">{formatCurrency(homeValue)}</p>
        </div>
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Equity</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(availableEquity)}</p>
        </div>
        <div className="p-4 bg-secondary rounded-xl border border-border">
          <p className="text-xs text-muted-foreground mb-1">Usable Equity (80% CLTV)</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(Math.max(0, usableEquity))}</p>
        </div>
      </div>

      {/* Mortgage Balance Section */}
      <div className="p-5 bg-secondary rounded-xl border border-border space-y-4">
        <Label className="text-sm flex items-center gap-2 text-muted-foreground">
          <DollarSign className="w-4 h-4" />
          Outstanding Total Mortgage Balance
        </Label>
        <div className="flex gap-4 items-center p-2 rounded-xl animate-breathe">
          <Slider 
            value={[mortgageBalance]} 
            onValueChange={value => setMortgageBalance(value[0])} 
            min={0} 
            max={homeValue * 0.95} 
            step={5000} 
            className="flex-1" 
          />
          <div>
            <Input 
              type="text" 
              value={formatCurrency(mortgageBalance)} 
              onChange={e => {
                const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                setMortgageBalance(Math.min(val, homeValue * 0.95));
              }} 
              className="text-3xl font-bold bg-background h-16 px-[25px] w-auto text-center" 
            />
          </div>
        </div>
      </div>

      {/* CLTV Section */}
      <div className="p-5 bg-secondary rounded-xl border border-border space-y-3">
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
        <div className="p-5 bg-secondary rounded-xl border border-accent/30">
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
        <div className="p-5 bg-secondary rounded-xl border border-destructive/30">
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
      <div className="p-5 bg-secondary rounded-xl border border-border">
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
    </div>
  );
}
