import { useState } from 'react';
import { WizardStep1 } from './WizardStep1';
import { WizardStep2 } from './WizardStep2';
import logo from '@/assets/logo-blue.png';

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
    <section className="min-h-screen bg-background py-8 px-2 md:px-8 flex items-center justify-center">
      {/* Content */}
      <div className="w-full max-w-4xl mx-auto px-2 md:px-12">
        {/* Header Row: Logo | Title (right-aligned) */}
        <div className="flex items-center justify-between mb-6 md:mb-10">
          {/* Left: Logo - aligned with content below */}
          <img 
            src={logo} 
            alt="Equity Advance" 
            className="h-10 md:h-16"
          />

          {/* Right: Property Pre-Qualifier Title */}
          <h1 className="text-base md:text-xl lg:text-2xl font-bold text-muted-foreground tracking-wider">
            Property Pre-Qualifier
          </h1>
        </div>

        {/* Wizard Content */}
        <div className="p-3 md:p-8">
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
        </div>
      </div>
    </section>
  );
}
