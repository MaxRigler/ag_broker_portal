import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Building2, CreditCard, TrendingUp, Check } from 'lucide-react';
import logo from '@/assets/logo.png';

interface HeroProps {
  onCheckEligibility: (address: string) => void;
}

const subheadlineItems = [
  'No monthly payments',
  'No income requirements',
  'No DTI impact',
  'No need for perfect credit'
];

const valueProps = [
  {
    icon: Building2,
    title: 'Non-Debt Capital',
    description: 'Not a loan; it is an equity investment in the property.'
  },
  {
    icon: CreditCard,
    title: 'Zero Monthly Friction',
    description: 'No interest or monthly payments for up to 10 years.'
  },
  {
    icon: TrendingUp,
    title: 'Credit Flexible',
    description: 'Use capital to pay off debts and potentially improve credit scores.'
  }
];

export function Hero({ onCheckEligibility }: HeroProps) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onCheckEligibility(address);
    }
  };

  return (
    <section className="relative min-h-screen bg-[hsl(var(--navy-deep))] overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy-deep))] via-[hsl(var(--navy-medium))] to-[hsl(var(--navy-deep))] opacity-90" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
        {/* Logo/Brand */}
        <div className="mb-16 flex justify-center">
          <img src={logo} alt="Equity Advance" className="h-20 w-auto" />
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in">
            Unlock up to{' '}
            <span className="text-gradient-blue">$500,000</span>
            <br />in Business Funding via Home Equity
          </h1>
          
          {/* Subheadline - Responsive checkmark list */}
          <div className="mb-12 max-w-3xl mx-auto animate-slide-up">
            {/* Desktop: Horizontal row with dividers */}
            <div className="hidden md:flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
              {subheadlineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-primary-foreground/80">{item}</span>
                  {index < subheadlineItems.length - 1 && (
                    <div className="w-px h-5 bg-primary-foreground/30 ml-4" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Mobile: Vertical stacked list */}
            <div className="flex md:hidden flex-col items-start gap-3 px-4">
              {subheadlineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-primary-foreground/80 text-left">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Address Input Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-16 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-card/10 backdrop-blur-sm rounded-xl border border-primary-foreground/10">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter Client's Property Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-12 h-14 bg-card border-0 text-foreground placeholder:text-muted-foreground text-base"
                />
              </div>
              <Button type="submit" variant="blue" size="xl" className="w-full sm:w-auto">
                Check Eligibility
              </Button>
            </div>
          </form>

          {/* Value Props */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {valueProps.map((prop, index) => (
              <div
                key={index}
                className="p-6 bg-card/5 backdrop-blur-sm rounded-xl border border-primary-foreground/10 hover:bg-card/10 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <prop.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-primary-foreground mb-2">
                  {prop.title}
                </h3>
                <p className="text-primary-foreground/70 text-sm">
                  {prop.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
