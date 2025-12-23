import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Calendar, TrendingUp, DollarSign, Calculator } from 'lucide-react';
import { calculateHEASettlement, formatCurrency, formatPercentage } from '@/lib/heaCalculator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SettlementEstimatorProps {
  homeValue: number;
  maxInvestment: number;
  fundingAmount: number;
  setFundingAmount: (value: number) => void;
  settlementYear: number;
  setSettlementYear: (value: number) => void;
  hpaRate: number;
  setHpaRate: (value: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  open,
  onOpenChange
}: SettlementEstimatorProps) {
  const calculation = useMemo(() => {
    return calculateHEASettlement(homeValue, fundingAmount, hpaRate, settlementYear);
  }, [fundingAmount, homeValue, settlementYear, hpaRate]);
  const equitySharePercent = calculation.unlockPercentage.toFixed(0);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-auto p-0">
        {/* Header Bar with Title */}
        <DialogHeader className="p-4 bg-secondary border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            <span className="text-lg font-semibold text-foreground">Settlement Estimator</span>
          </DialogTitle>
        </DialogHeader>
        
        {/* Calculator Content */}
        <div className="space-y-6 p-6">
          {/* Formula Row - Mobile: 2 cards side by side + 1 below | Desktop: all inline */}
          <div className="space-y-3 md:space-y-0">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-3">
              {/* Top row: Ending Home Value × Equity Share % = */}
              <div className="flex items-stretch gap-2">
                <div className="flex-1 p-3 bg-background rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Ending Value</p>
                  <p className="text-base font-bold text-foreground">{formatCurrency(calculation.endingHomeValue)}</p>
                  <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
                    Projected Home Value at Settlement
                  </p>
                </div>
                
                <span className="flex items-center text-sm font-medium text-muted-foreground">×</span>
                
                <div className="flex-1 p-3 bg-background rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Equity Share</p>
                  <p className="text-base font-bold text-foreground">{equitySharePercent}%</p>
                  <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
                    2X Funding ÷ Starting Home Value
                  </p>
                </div>
                
                <span className="flex items-center text-sm font-medium text-muted-foreground">=</span>
              </div>
              
              {/* Bottom row: Total Cost of Capital @ Annualized Cost */}
              <div className="flex items-stretch gap-2">
                <div className="flex-1 p-3 bg-background rounded-lg border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Cost of Capital</p>
                  <p className="text-base font-bold text-foreground">{formatCurrency(calculation.totalCostOfCapital)}</p>
                  <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
                    Settlement Amount - Initial Funding
                  </p>
                </div>
                
                <span className="flex items-center text-sm font-medium text-muted-foreground">@</span>
                
                <div className="flex-1 p-3 bg-background rounded-lg border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Annualized Cost</p>
                  <p className="text-base font-bold text-[hsl(var(--success))]">{formatPercentage(calculation.annualizedCost, 1)}</p>
                  <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
                    Capped at 19.9% annualized cost limit
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex flex-wrap items-center justify-center gap-2 text-center">
              <div className="flex-1 min-w-[160px] max-w-[200px] p-4 bg-background rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Ending Home Value</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(calculation.endingHomeValue)}</p>
                <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                  Projected Home Value at Settlement
                </p>
              </div>
              
              <span className="text-lg font-medium text-muted-foreground">×</span>
              
              <div className="flex-1 min-w-[160px] max-w-[200px] p-4 bg-background rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Equity Share %</p>
                <p className="text-lg font-bold text-foreground">{equitySharePercent}%</p>
                <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                  2X Funding ÷ Starting Home Value
                </p>
              </div>
              
              <span className="text-lg font-medium text-muted-foreground">=</span>
              
              <div className="flex-1 min-w-[160px] max-w-[200px] p-4 bg-background rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Total Cost of Capital</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(calculation.totalCostOfCapital)}</p>
                <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                  Settlement Amount - Initial Funding
                </p>
              </div>
              
              <span className="text-lg font-medium text-muted-foreground">@</span>
              
              <div className="flex-1 min-w-[160px] max-w-[200px] p-4 bg-background rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Annualized Cost</p>
                <p className="text-lg font-bold text-[hsl(var(--success))]">{formatPercentage(calculation.annualizedCost, 1)}</p>
                <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                  Capped at 19.9% annualized cost limit
                </p>
              </div>
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

          {/* Disclaimer */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">The Settlement Amount is calculated as the fixed equity share percentage of the property's Ending Home Value. To protect against market volatility, this payment is capped at a 19.9% Annualized Cost Limit, ensuring your total cost never exceeds this effective rate.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}