import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';
import logo from '@/assets/logo.png';

interface HeroProps {
  onCheckEligibility: (address: string) => void;
}

const subheadlineItems = [
  'No Monthly Payments',
  'No Income Requirements',
  'No DTI Impact',
  'No Need For Perfect Credit'
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

      <div className="relative z-10 mx-auto px-5 md:px-4 min-h-screen flex flex-col justify-center md:block md:py-16 lg:py-24 max-w-[1000px]">
        {/* Main Content */}
        <div className="mx-auto text-left md:text-center">
          {/* Logo/Brand */}
          <div className="mb-10 md:mb-[60px] flex justify-start md:justify-center">
            <img src={logo} alt="Equity Advance" className="h-20 w-auto" />
          </div>
          <h1 className="text-[32px] md:text-[48px] font-bold text-primary-foreground leading-[1.1] mb-6 md:mb-8 animate-fade-in">
            <span className="block md:inline">Unlock up to <span className="text-gradient-blue">$500,000</span></span>
            <span className="block md:inline"> in Business Funding</span>
            <span className="block md:inline"> via Home Equity</span>
          </h1>
          
          {/* Subheadline - Responsive checkmark list */}
          <div className="mb-8 md:mb-12 mx-auto animate-slide-up">
            {/* Desktop: 4-column grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-4 justify-items-center">
              {subheadlineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-primary-foreground/80 text-base">{item}</span>
                </div>
              ))}
            </div>
            
            {/* Mobile: Vertical stacked list */}
            <div className="flex md:hidden flex-col items-start gap-4">
              {subheadlineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-primary-foreground/80 text-base">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Address Input Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto md:mb-16 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col md:flex-row gap-3 p-2 bg-card/10 backdrop-blur-sm rounded-lg border border-muted/30">
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
              <Button type="submit" variant="blue" size="xl" className="w-full md:w-auto">
                See if my home qualifies
              </Button>
            </div>
          </form>

        </div>
      </div>
    </section>
  );
}
