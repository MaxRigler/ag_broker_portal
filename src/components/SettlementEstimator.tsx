import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Calendar, TrendingUp, DollarSign, Calculator, X } from 'lucide-react';
import { calculateHEACost, formatCurrency, formatPercentage } from '@/lib/heaCalculator';
interface SettlementEstimatorProps {
  homeValue: number;
  maxInvestment: number;
  fundingAmount: number;
  setFundingAmount: (value: number) => void;
  settlementYear: number;
  setSettlementYear: (value: number) => void;
  hpaRate: number;
  setHpaRate: (value: number) => void;
  onClose: () => void;
}
export function SettlementEstimator({
  homeValue,
  maxInvestment,
  fundingAmount,
  setFundingAmount,
  settlementYear,
  setSettlementYear,
  hpaRate,
  setHpaRate,
  onClose
}: SettlementEstimatorProps) {
  const calculation = useMemo(() => {
    return calculateHEACost(fundingAmount, homeValue, settlementYear, hpaRate);
  }, [fundingAmount, homeValue, settlementYear, hpaRate]);
  const equitySharePercent = (fundingAmount / homeValue * 2 * 100).toFixed(0);
  return <div className="animate-fade-in mt-6">
      {/* Header Bar with Title and Close Button */}
      <div className="flex items-center justify-between p-4 bg-secondary rounded-t-xl border border-border border-b-0">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-accent" />
          <span className="text-sm font-semibold text-foreground">Settlement Estimator</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground" aria-label="Close calculator">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Calculator Content */}
      <div className="space-y-6 p-6 bg-secondary/50 rounded-b-xl border border-border border-t-0">
      {/* Formula Row */}
      <div className="flex items-center justify-center gap-2 text-center">
        <div className="flex-1 max-w-[180px] p-4 bg-background rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-1">Ending Home Value</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(calculation.endingHomeValue)}</p>
          <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
            Your home's projected value at settlement. Calculated using today's value plus annual appreciation.
          </p>
        </div>
        
        <span className="text-lg font-medium text-muted-foreground">Ending Value</span>
        
        <div className="flex-1 max-w-[160px] p-4 bg-background rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-1">Equity Share %</p>
          <p className="text-lg font-bold text-foreground">{equitySharePercent}%</p>
          <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
            The percentage of your home's value we receive at settlement. This equals 2× your funding amount divided by home value.
          </p>
        </div>
        
        <span className="text-lg font-medium text-muted-foreground">=</span>
        
        <div className="flex-1 max-w-[180px] p-4 bg-background rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Cost of Capital</p>
          <p className="text-lg font-bold text-[hsl(var(--success))]">{formatCurrency(calculation.totalCost)}</p>
          <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
            The total amount you'll pay to settle. This is the equity share percentage of your ending home value.
          </p>
        </div>
      </div>

      {/* Funding Amount Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Funding Amount</span>
          </div>
          <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-bold">
            {formatCurrency(fundingAmount)}
          </span>
        </div>
        <Slider value={[fundingAmount]} onValueChange={value => setFundingAmount(value[0])} min={15000} max={maxInvestment} step={1000} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>$15K</span>
          <span>{formatCurrency(maxInvestment)}</span>
        </div>
      </div>

      {/* Settlement Year Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Settlement Year</span>
          </div>
          <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-bold">
            {settlementYear} {settlementYear === 1 ? 'Year' : 'Years'}
          </span>
        </div>
        <Slider value={[settlementYear]} onValueChange={value => setSettlementYear(value[0])} min={1} max={10} step={1} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 Year</span>
          <span>10 Years</span>
        </div>
      </div>

      {/* Annual Appreciation Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Annual Appreciation</span>
          </div>
          <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-bold">
            {hpaRate >= 0 ? '+' : ''}{formatPercentage(hpaRate * 100, 1)}
          </span>
        </div>
        <Slider value={[hpaRate * 100]} onValueChange={value => setHpaRate(value[0] / 100)} min={-2} max={6} step={0.5} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-2%</span>
          <span>+6%</span>
        </div>
      </div>

      {/* Disclaimer and APR */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground max-w-md">The Settlement Amount is calculated as the fixed equity share percentage of the property’s Ending Home Value. To protect against market volatility, this payment is capped at a 19.9% Annualized Cost Limit, ensuring your total cost never exceeds this effective rate</p>
        <div className="px-4 py-2 bg-background rounded-lg border border-border text-center">
          <p className="text-xs text-muted-foreground">APR</p>
          <p className="text-lg font-bold text-foreground">{formatPercentage(calculation.apr * 100, 1)}</p>
        </div>
      </div>
      </div>
    </div>;
}