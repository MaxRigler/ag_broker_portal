import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowLeft } from 'lucide-react';
import { WizardStep1 } from './WizardStep1';
import { WizardStep2 } from './WizardStep2';
import { WizardStep3 } from './WizardStep3';

interface UnderwritingWizardProps {
  address: string;
  onBack: () => void;
}

type Step = 1 | 2 | 3;

interface WizardData {
  homeValue: number;
  state: string;
  mortgageBalance: number;
  maxInvestment: number;
}

const steps = [
  { id: 1, title: 'Property Validation' },
  { id: 2, title: 'Debt & CLTV Analysis' },
  { id: 3, title: 'Payoff Estimator' },
];

export function UnderwritingWizard({ address, onBack }: UnderwritingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({});

  const handleStep1Complete = (data: { homeValue: number; state: string }) => {
    setWizardData({ ...wizardData, ...data });
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: { mortgageBalance: number; maxInvestment: number }) => {
    setWizardData({ ...wizardData, ...data });
    setCurrentStep(3);
  };

  const handleReset = () => {
    setWizardData({});
    setCurrentStep(1);
    onBack();
  };

  return (
    <section className="relative min-h-screen bg-[hsl(var(--navy-deep))] overflow-hidden py-8 px-4">
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
      <div className="relative z-10 container max-w-7xl mx-auto">
        {/* Back to Home */}
        <Button variant="ghost" onClick={onBack} className="mb-6 text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary-foreground/10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      currentStep > step.id
                        ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]'
                        : currentStep === step.id
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-primary-foreground/20 text-primary-foreground/60'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      currentStep >= step.id ? 'text-primary-foreground' : 'text-primary-foreground/60'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${
                      currentStep > step.id ? 'bg-[hsl(var(--success))]' : 'bg-primary-foreground/20'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Card */}
        <Card className="shadow-lg bg-card/95 backdrop-blur-sm">
          <CardContent className="p-6">
            {currentStep === 1 && (
              <WizardStep1
                address={address}
                onComplete={handleStep1Complete}
                onBack={onBack}
              />
            )}
            {currentStep === 2 && wizardData.homeValue && (
              <WizardStep2
                homeValue={wizardData.homeValue}
                onComplete={handleStep2Complete}
                onBack={() => setCurrentStep(1)}
              />
            )}
            {currentStep === 3 && wizardData.homeValue && wizardData.maxInvestment && (
              <WizardStep3
                homeValue={wizardData.homeValue}
                maxInvestment={wizardData.maxInvestment}
                onBack={() => setCurrentStep(2)}
                onReset={handleReset}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
