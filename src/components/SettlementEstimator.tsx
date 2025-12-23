import { useMemo, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Calendar, TrendingUp, DollarSign, Calculator, ShieldCheck, HelpCircle, ArrowLeft } from 'lucide-react';
import { calculateHEASettlement, formatCurrency, formatPercentage } from '@/lib/heaCalculator';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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
  const [showHelp, setShowHelp] = useState(false);
  
  const calculation = useMemo(() => {
    return calculateHEASettlement(homeValue, fundingAmount, hpaRate, settlementYear);
  }, [fundingAmount, homeValue, settlementYear, hpaRate]);
  const equitySharePercent = calculation.unlockPercentage.toFixed(0);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-auto p-0" hideCloseButton>
        {/* Header Bar with Title */}
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            {/* Left side: Back button + Title */}
            <div className="flex items-center gap-3">
              {/* Back Button */}
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 flex items-center justify-center bg-background border border-border rounded-lg shadow-sm hover:bg-secondary transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </button>
              
              <DialogTitle className="flex items-center gap-2">
                {/* Desktop title */}
                <span className="hidden md:inline text-lg font-semibold text-foreground">
                  Equity Advance Client Settlement Estimator
                </span>
                {/* Mobile title */}
                <span className="md:hidden text-base font-semibold text-foreground">
                  Client Settlement Estimator
                </span>
              </DialogTitle>
            </div>
            
            {/* Right side: Help Button */}
            {/* Desktop Help Button - Rectangular */}
            <button
              onClick={() => setShowHelp(true)}
              className="hidden md:flex items-center px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              How It Works
            </button>
            
            {/* Mobile Help Button - Circular Icon */}
            <button
              onClick={() => setShowHelp(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center bg-accent text-white rounded-full text-sm font-bold hover:bg-accent/90 transition-colors"
              aria-label="How It Works"
            >
              ?
            </button>
          </div>
        </DialogHeader>
        
        {/* Calculator Content */}
        <div className="space-y-6 p-6">
          {/* Formula Row - Mobile: 2 cards side by side + 1 below | Desktop: all inline */}
          <div className="space-y-3 md:space-y-0">
            {/* Mobile Layout */}
            <div className="md:hidden">
              <div className="grid grid-cols-[1fr_24px_1fr] gap-y-0 gap-x-0 items-center">
                {/* Row 1, Col 1: Ending Value */}
                <div className="h-[100px] p-3 bg-background rounded-lg border border-border relative">
                  <p className="text-xs text-muted-foreground absolute top-3 left-3">Ending Value</p>
                  <p className="text-base font-bold text-foreground absolute top-[30px] left-3">{formatCurrency(calculation.endingHomeValue)}</p>
                  <p className="text-[9px] text-muted-foreground absolute bottom-3 left-3 right-3 leading-tight">
                    Projected Home Value<br />at Settlement
                  </p>
                </div>
                
                {/* Row 1, Col 2: × operator */}
                <div className="flex justify-center items-center h-[100px]">
                  <span className="text-sm font-medium text-muted-foreground">×</span>
                </div>
                
                {/* Row 1, Col 3: Equity Share */}
                <div className="h-[100px] p-3 bg-background rounded-lg border border-border relative">
                  <p className="text-xs text-muted-foreground absolute top-3 left-3">Equity Share</p>
                  <p className="text-base font-bold text-foreground absolute top-[30px] left-3">{equitySharePercent}%</p>
                  <p className="text-[9px] text-muted-foreground absolute bottom-3 left-3 right-3 leading-tight">
                    2X Funding ÷ Starting<br />Home Value
                  </p>
                </div>
                
                {/* Row 2: Centered = sign */}
                <div></div>
                <div className="flex justify-center items-center h-4">
                  <span className="text-sm font-medium text-muted-foreground">=</span>
                </div>
                <div></div>
                
                {/* Row 3, Col 1: Cost of Capital */}
                <div className={cn(
                  "h-[100px] p-3 bg-background rounded-lg border relative transition-all duration-300",
                  calculation.isCapActive 
                    ? "border-[hsl(var(--success))] ring-1 ring-[hsl(var(--success))]/30" 
                    : "border-border"
                )}>
                  <p className="text-xs text-muted-foreground absolute top-3 left-3">Cost of Capital</p>
                  <p className="text-base font-bold text-foreground absolute top-[30px] left-3">{formatCurrency(calculation.totalCostOfCapital)}</p>
                  {calculation.isCapActive ? (
                    <div className="absolute bottom-3 left-3 right-3 space-y-0 animate-savings-slide">
                      <p className="text-[9px] text-muted-foreground line-through decoration-destructive decoration-1">
                        Without cap: {formatCurrency(calculation.rawTotalCostOfCapital)}
                      </p>
                      <p className="text-[9px] font-medium text-[hsl(var(--success))]">
                        You save: {formatCurrency(calculation.savingsFromCap)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[9px] text-muted-foreground absolute bottom-3 left-3 right-3 leading-tight">
                      Settlement Amount -<br />Initial Funding
                    </p>
                  )}
                </div>
                
                {/* Row 3, Col 2: @ operator - aligned with × above */}
                <div className="flex justify-center items-center h-[100px]">
                  <span className="text-sm font-medium text-muted-foreground">@</span>
                </div>
                
                {/* Row 3, Col 3: Annualized Cost */}
                <div className={cn(
                  "h-[100px] p-3 bg-background rounded-lg border relative transition-all duration-300",
                  calculation.isCapActive 
                    ? "border-[hsl(var(--success))] ring-2 ring-[hsl(var(--success))]/30 animate-pulse-glow" 
                    : "border-border"
                )}>
                  {/* CAP ACTIVE Badge */}
                  {calculation.isCapActive && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 animate-shield-pop z-10">
                      <div className="flex items-center gap-0.5 px-2 py-0.5 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[8px] font-bold rounded-full whitespace-nowrap shadow-lg">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        CAP ACTIVE
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground absolute top-3 left-3">Annualized Cost</p>
                  <p className={cn(
                    "text-base font-bold absolute top-[30px] left-3 transition-all duration-300",
                    calculation.isCapActive 
                      ? "text-[hsl(var(--success))] scale-105" 
                      : "text-[hsl(var(--success))]"
                  )}>
                    {formatPercentage(calculation.annualizedCost, 1)}
                  </p>
                  <p className="text-[9px] text-muted-foreground absolute bottom-3 left-3 right-3 leading-tight">
                    {calculation.isCapActive ? "Protected by 19.9% cap" : "Capped at 19.9% limit"}
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex flex-wrap items-center justify-center gap-2 text-center">
              <div className="flex-1 min-w-[160px] max-w-[200px] min-h-[120px] p-4 bg-background rounded-lg border border-border flex flex-col">
                <p className="text-xs text-muted-foreground mb-1">Ending Home Value</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(calculation.endingHomeValue)}</p>
                <p className="text-[10px] text-muted-foreground mt-auto leading-tight">
                  Projected Home Value at Settlement
                </p>
              </div>
              
              <span className="text-lg font-medium text-muted-foreground">×</span>
              
              <div className="flex-1 min-w-[160px] max-w-[200px] min-h-[120px] p-4 bg-background rounded-lg border border-border flex flex-col">
                <p className="text-xs text-muted-foreground mb-1">Equity Share %</p>
                <p className="text-lg font-bold text-foreground">{equitySharePercent}%</p>
                <p className="text-[10px] text-muted-foreground mt-auto leading-tight">
                  2X Funding ÷ Starting Home Value
                </p>
              </div>
              
              <span className="text-lg font-medium text-muted-foreground">=</span>
              
              <div className={cn(
                "flex-1 min-w-[160px] max-w-[200px] min-h-[120px] p-4 bg-background rounded-lg border transition-all duration-300 flex flex-col",
                calculation.isCapActive 
                  ? "border-[hsl(var(--success))] ring-1 ring-[hsl(var(--success))]/30" 
                  : "border-border"
              )}>
                <p className="text-xs text-muted-foreground mb-1">Total Cost of Capital</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(calculation.totalCostOfCapital)}</p>
                {calculation.isCapActive && (
                  <div className="mt-auto space-y-0.5 animate-savings-slide">
                    <p className="text-[10px] text-muted-foreground line-through decoration-destructive decoration-2">
                      Without cap: {formatCurrency(calculation.rawTotalCostOfCapital)}
                    </p>
                    <p className="text-[10px] font-medium text-[hsl(var(--success))]">
                      You save: {formatCurrency(calculation.savingsFromCap)}
                    </p>
                  </div>
                )}
                {!calculation.isCapActive && (
                  <p className="text-[10px] text-muted-foreground mt-auto leading-tight">
                    Settlement Amount - Initial Funding
                  </p>
                )}
              </div>
              
              <span className="text-lg font-medium text-muted-foreground">@</span>
              
              <div className={cn(
                "flex-1 min-w-[160px] max-w-[200px] min-h-[120px] p-4 bg-background rounded-lg border relative transition-all duration-300 flex flex-col",
                calculation.isCapActive 
                  ? "border-[hsl(var(--success))] ring-2 ring-[hsl(var(--success))]/30 animate-pulse-glow" 
                  : "border-border"
              )}>
                {/* CAP ACTIVE Badge */}
                {calculation.isCapActive && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-shield-pop z-10">
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] font-bold rounded-full whitespace-nowrap shadow-lg">
                      <ShieldCheck className="w-3 h-3" />
                      CAP ACTIVE
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mb-1">Annualized Cost</p>
                <p className={cn(
                  "text-lg font-bold transition-all duration-300",
                  calculation.isCapActive 
                    ? "text-[hsl(var(--success))] scale-110" 
                    : "text-[hsl(var(--success))]"
                )}>
                  {formatPercentage(calculation.annualizedCost, 1)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-auto leading-tight">
                  {calculation.isCapActive ? "Protected by 19.9% cap" : "Capped at 19.9% annualized cost limit"}
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
            <p className="text-xs text-muted-foreground"><strong>For Illustrative Purposes Only; Not an Offer or Commitment</strong> The projections, estimates, and data generated by this Settlement Estimator are for informational and educational purposes only. This module does not constitute an offer, a solicitation of an offer, or a commitment to enter into a Home Equity Agreement (HEA). <strong>Actual Terms May Vary</strong> All calculations are based on hypothetical assumptions regarding home appreciation and term length; actual results will vary significantly based on individual property characteristics, credit history, and market conditions. Final terms are determined solely during underwriting and will be disclosed in the Investment Closing Statement. This tool does not account for specific third-party closing costs, origination fees, or adjustments for home maintenance and improvements. Consult with professional financial, tax, and legal advisors before making any decisions.</p>
          </div>
        </div>
        
        {/* Help Panel - Slides in from right */}
        <Sheet open={showHelp} onOpenChange={setShowHelp}>
          <SheetContent side="right" className="w-full sm:max-w-lg overflow-auto">
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowHelp(false)}
                  className="p-1 hover:bg-secondary rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <SheetTitle>How Settlement Works</SheetTitle>
              </div>
            </SheetHeader>
            
            {/* Help Content */}
            <div className="space-y-6 text-sm">
              {/* Core Variables Section */}
              <section>
                <h3 className="text-lg font-bold text-foreground mb-4 border-b pb-2">
                  Core Variables Defined
                </h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="font-semibold text-foreground">Starting Property Value</dt>
                    <dd className="text-muted-foreground">The initial value of your client's property at the beginning of the agreement.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Investment Payment</dt>
                    <dd className="text-muted-foreground">The lump-sum funding amount provided upfront.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Investment Percentage</dt>
                    <dd className="text-muted-foreground">Your Funding Amount expressed as a percentage of your client's Starting Property Value.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Exchange Rate</dt>
                    <dd className="text-muted-foreground">The "price" or multiplier of the agreement, typically 2.0 for primary residences.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Equity Share Percentage</dt>
                    <dd className="text-muted-foreground">The fixed share of your home's future value that Equity Advance receives at settlement. Calculated as: Investment Percentage × Exchange Rate.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Ending Property Value</dt>
                    <dd className="text-muted-foreground">The value of your home when the agreement ends, determined by a sale price or a new appraisal.</dd>
                  </div>
                </dl>
              </section>

              {/* How Variables Work Together Section */}
              <section>
                <h3 className="text-lg font-bold text-foreground mb-4 border-b pb-2">
                  How the Variables Work Together
                </h3>
                <p className="text-muted-foreground mb-4">
                  The settlement (or "payoff") amount is calculated through a specific logical sequence to ensure the partnership remains fair to both you and the investor.
                </p>
                
                {/* Step 1 */}
                <div className="mb-4 p-4 bg-secondary rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">1. The Equity Calculation</h4>
                  <p className="text-muted-foreground mb-2">
                    The foundation of the payoff is the Equity Share Percentage. For every 1% of your property's value you receive today, you typically agree to share 2% of the property's value in the future (assuming a 2.0 Exchange Rate).
                  </p>
                  <div className="p-3 bg-background rounded border border-border text-center font-mono text-sm">
                    Ending Property Value × Equity Share Percentage = Settlement Amount
                  </div>
                </div>
                
                {/* Step 2 */}
                <div className="mb-4 p-4 bg-secondary rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">2. The Annualized Cost Limit (Your "Safety Net")</h4>
                  <p className="text-muted-foreground">
                    To protect you from high costs if your property value skyrockets or if you settle the agreement very early, Equity Advance applies an Annualized Cost Limit of 19.9%.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Equity Advance calculates what the total cost would be if it were a loan capped at 19.9% interest per year. If the equity calculation in Step 1 is higher than this cap, Equity Advance automatically reduces its share to match the lower 19.9% limit.
                  </p>
                </div>
                
                {/* Step 3 */}
                <div className="mb-4 p-4 bg-secondary rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">3. Adjusting for Your Hard Work</h4>
                  <p className="text-muted-foreground mb-2">
                    Before the final payoff is set, the Ending Home Value can be modified by two types of adjustments:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li><strong>Improvement Adjustment:</strong> If you renovated your property, the value added by those improvements is subtracted from the home value so Equity Advance does not share in your profit.</li>
                    <li><strong>Maintenance Adjustment:</strong> If the property fell into disrepair, the cost of deferred maintenance is added back to the home value so the investor's share is not unfairly reduced by a lack of upkeep.</li>
                  </ul>
                </div>
                
                {/* Step 4 */}
                <div className="p-4 bg-secondary rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">4. The Final Settlement Payment</h4>
                  <p className="text-muted-foreground">
                    The final amount you pay to end the agreement is the Settlement Payment. This is the Equity Share Percentage (capped by the safety net) plus any Unpaid Owner Obligations, such as unreimbursed appraisal fees or property taxes paid by Equity Advance on your client's behalf.
                  </p>
                </div>
              </section>
            </div>
            
            {/* Back to Calculator Button */}
            <div className="mt-8 pt-4 border-t">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Calculator
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </DialogContent>
    </Dialog>
  );
}
