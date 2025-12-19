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
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Back to Home */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
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
                        : 'bg-secondary text-muted-foreground'
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
                      currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${
                      currentStep > step.id ? 'bg-[hsl(var(--success))]' : 'bg-secondary'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Card */}
        <Card className="shadow-lg">
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
    </div>
  );
}
