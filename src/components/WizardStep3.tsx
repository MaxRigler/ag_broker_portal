import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, TrendingUp, Calculator, Shield, RefreshCw } from 'lucide-react';
import { calculateHEACost, formatCurrency, formatPercentage } from '@/lib/heaCalculator';

interface WizardStep3Props {
  homeValue: number;
  maxInvestment: number;
  onBack: () => void;
  onReset: () => void;
}

export function WizardStep3({ homeValue, maxInvestment, onBack, onReset }: WizardStep3Props) {
  const [fundingAmount, setFundingAmount] = useState(maxInvestment);
  const [settlementYear, setSettlementYear] = useState(5);
  const [hpaRate, setHpaRate] = useState(0.03); // 3% default

  const calculation = useMemo(() => {
    return calculateHEACost(fundingAmount, homeValue, settlementYear, hpaRate);
  }, [fundingAmount, homeValue, settlementYear, hpaRate]);

  return (
    <div className="space-y-8">
      {/* Maximum Funding Header */}
      <div className="text-center p-6 bg-[hsl(var(--navy-deep))] rounded-xl">
        <p className="text-sm text-primary-foreground/70 mb-1">Maximum Potential Funding</p>
        <p className="text-4xl md:text-5xl font-bold text-gradient-blue">{formatCurrency(maxInvestment)}</p>
      </div>

      {/* Interactive Sliders */}
      <div className="space-y-8">
        {/* Funding Amount */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-accent" />
              Funding Amount
            </Label>
            <span className="text-xl font-bold text-accent">{formatCurrency(fundingAmount)}</span>
          </div>
          <Slider
            value={[fundingAmount]}
            onValueChange={(value) => setFundingAmount(value[0])}
            min={15000}
            max={maxInvestment}
            step={5000}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(15000)}</span>
            <span>{formatCurrency(maxInvestment)}</span>
          </div>
        </div>

        {/* Settlement Year */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              Settlement Year
            </Label>
            <span className="text-xl font-bold text-foreground">{settlementYear} {settlementYear === 1 ? 'Year' : 'Years'}</span>
          </div>
          <Slider
            value={[settlementYear]}
            onValueChange={(value) => setSettlementYear(value[0])}
            min={1}
            max={10}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 Year</span>
            <span>10 Years</span>
          </div>
        </div>

        {/* HPA Rate */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Home Price Appreciation (Annual)
            </Label>
            <span className={`text-xl font-bold ${hpaRate >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              {hpaRate >= 0 ? '+' : ''}{formatPercentage(hpaRate * 100)}
            </span>
          </div>
          <Slider
            value={[hpaRate * 100]}
            onValueChange={(value) => setHpaRate(value[0] / 100)}
            min={-2}
            max={6}
            step={0.5}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-2%</span>
            <span>+6%</span>
          </div>
        </div>
      </div>

      {/* Results Card */}
      <div className="p-6 bg-card border border-border rounded-xl shadow-lg space-y-6">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-lg text-foreground">Payoff Estimate</h3>
          {calculation.isCapped && (
            <Badge variant="outline" className="ml-auto bg-accent/10 text-accent border-accent/30">
              <Shield className="w-3 h-3 mr-1" />
              Cost Capped at 19.9%
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Estimated Payoff at Year {settlementYear}</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(calculation.payoff)}</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Effective Annualized Cost</p>
            <p className="text-2xl font-bold text-accent">{formatPercentage(calculation.apr)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Cost of Capital</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(calculation.totalCost)}</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Projected Home Value (Year {settlementYear})</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(calculation.endingHomeValue)}</p>
          </div>
        </div>

        {calculation.isCapped && (
          <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Note:</span> The 19.9% annualized cost cap is protecting your client. 
              Without the cap, the payoff would be {formatCurrency(calculation.rawUnlockShare)}.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button variant="blue" onClick={onReset} className="flex-1">
          <RefreshCw className="w-4 h-4 mr-2" />
          New Qualification
        </Button>
      </div>
    </div>
  );
}
