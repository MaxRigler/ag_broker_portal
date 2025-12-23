import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { WizardStep1 } from './WizardStep1';
import { WizardStep2 } from './WizardStep2';
import logo from '@/assets/logo.png';

interface UnderwritingWizardProps {
  address: string;
  onBack: () => void;
}

type Step = 1 | 2;

interface WizardData {
  homeValue: number;
  state: string;
  mortgageBalance: number;
  maxInvestment: number;
  propertyType: string;
  ownershipType: string;
  currentCLTV: number;
}

const steps = [
  { id: 1, title: 'Property Validation' },
  { id: 2, title: 'Payoff Estimator' },
];

export function UnderwritingWizard({ address, onBack }: UnderwritingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({});

  const handleStep1Complete = (data: { 
    homeValue: number; 
    state: string; 
    mortgageBalance: number; 
    maxInvestment: number;
    propertyType: string;
    ownershipType: string;
    currentCLTV: number;
  }) => {
    setWizardData({ ...wizardData, ...data });
    setCurrentStep(2);
  };

  const handleReset = () => {
    setWizardData({});
    setCurrentStep(1);
    onBack();
  };

  return (
    <section className="relative min-h-screen bg-[hsl(var(--navy-deep))] overflow-hidden py-8 px-2 md:px-8 flex items-center justify-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('https://media-cldnry.s-nbcnews.com/image/upload/t_fit-1000w,f_auto,q_auto:best/rockcms/2025-06/250611-homes-suburbs-ch-1721-69f6cf.jpg')` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy-deep))] via-[hsl(var(--navy-medium))] to-[hsl(var(--navy-deep))] opacity-95" />
      
      {/* Animated Background Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-accent rounded-full blur-3xl animate-float-glow" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent rounded-full blur-3xl animate-float-glow-reverse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl animate-glow-pulse" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-2 md:px-12">
        {/* Header Row: Logo | Title (right-aligned) */}
        <div className="flex items-center justify-between mb-6 md:mb-10">
          {/* Left: Logo - aligned with content below */}
          <img 
            src={logo} 
            alt="Equity Advance" 
            className="h-10 md:h-16"
          />

          {/* Right: Property Pre-Qualifier Title */}
          <h1 className="text-base md:text-xl lg:text-2xl font-bold text-primary-foreground tracking-wider">
            Property Pre-Qualifier
          </h1>
        </div>

        {/* Wizard Card */}
        <Card className="shadow-lg bg-card/95 backdrop-blur-sm">
          <CardContent className="p-3 md:p-8">
            {currentStep === 1 && (
              <WizardStep1
                address={address}
                onComplete={handleStep1Complete}
                onBack={onBack}
              />
            )}
            {currentStep === 2 && wizardData.homeValue && wizardData.maxInvestment && (
              <WizardStep2
                address={address}
                homeValue={wizardData.homeValue}
                mortgageBalance={wizardData.mortgageBalance || 0}
                maxInvestment={wizardData.maxInvestment}
                state={wizardData.state || ''}
                propertyType={wizardData.propertyType || ''}
                ownershipType={wizardData.ownershipType || ''}
                currentCLTV={wizardData.currentCLTV || 0}
                onBack={() => setCurrentStep(1)}
                onReset={handleReset}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
