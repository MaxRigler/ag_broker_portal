import { useState } from 'react';
import { Hero } from '@/components/Hero';
import { UnderwritingWizard } from '@/components/UnderwritingWizard';

const Index = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [propertyAddress, setPropertyAddress] = useState('');

  const handleCheckEligibility = (address: string) => {
    setPropertyAddress(address);
    setShowWizard(true);
  };

  const handleBackToHome = () => {
    setShowWizard(false);
    setPropertyAddress('');
  };

  if (showWizard) {
    return (
      <UnderwritingWizard
        address={propertyAddress}
        onBack={handleBackToHome}
      />
    );
  }

  return <Hero onCheckEligibility={handleCheckEligibility} />;
};

export default Index;
