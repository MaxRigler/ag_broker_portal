import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';
import logo from '@/assets/logo.png';
import heroBg from '@/assets/hero-bg.png';

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
      {/* Background image layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy-deep))] via-[hsl(var(--navy-medium))] to-[hsl(var(--navy-deep))] opacity-95" />
      
      {/* Animated decorative elements with combined float + glow */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-accent rounded-full blur-3xl animate-float-glow" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent rounded-full blur-3xl animate-float-glow-reverse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl animate-glow-pulse" />

      <div className="relative z-10 container mx-auto px-2 md:px-4 min-h-screen flex flex-col justify-center md:block md:py-16 lg:py-24">
        {/* Main Content */}
        <div className="max-w-4xl mx-auto text-left md:text-center">
          {/* Logo/Brand */}
          <div className="mb-8 md:mb-16 flex justify-start md:justify-center">
            <img src={logo} alt="Equity Advance" className="h-20 w-auto" />
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in">
            {/* Mobile: 3-line stacked layout */}
            <span className="md:hidden">
              <span className="block">Unlock up to <span className="text-gradient-blue">$500,000</span></span>
              <span className="block">in Business Funding</span>
              <span className="block">via Home Equity</span>
            </span>
            {/* Desktop: 3-line layout */}
            <span className="hidden md:inline">
              <span className="block whitespace-nowrap">Unlock up to <span className="text-gradient-blue">$500,000</span></span>
              <span className="block whitespace-nowrap">in Business Funding</span>
              <span className="block whitespace-nowrap">via Home Equity</span>
            </span>
          </h1>
          
          {/* Mobile Subheadline - Vertical stacked list (before form on mobile) */}
          <div className="mb-12 max-w-3xl mx-auto animate-slide-up md:hidden">
            <div className="flex flex-col items-start gap-3">
              {subheadlineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-primary-foreground/80 text-left font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Address Input Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8 md:mt-12 md:mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
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

          {/* Desktop Subheadline - Horizontal row (after form on desktop) */}
          <div className="hidden md:block max-w-3xl mx-auto animate-slide-up">
            <div className="flex flex-nowrap justify-center items-center gap-x-2">
              {subheadlineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-primary-foreground/80 text-sm whitespace-nowrap font-bold">{item}</span>
                  {index < subheadlineItems.length - 1 && (
                    <div className="w-px h-4 bg-primary-foreground/30 ml-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
