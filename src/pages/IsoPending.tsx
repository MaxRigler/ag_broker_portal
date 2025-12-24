import { useEffect } from 'react';
import logoBlue from '@/assets/logo-blue.png';
import { CheckCircle } from 'lucide-react';

export default function IsoPending() {
  useEffect(() => {
    // Dynamically load Calendly script
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <img 
          src={logoBlue} 
          alt="Equity Advance" 
          className="h-16 mx-auto mb-6"
        />
        
        <div className="flex items-center justify-center gap-3 mb-4">
          <CheckCircle className="h-10 w-10 text-green-500" />
          <h1 className="text-3xl font-bold text-primary">Congratulations!</h1>
        </div>
        
        <p className="text-lg text-muted-foreground mb-8">
          Your account is now pending. To activate it, book a call below.
        </p>

        {/* Calendly Inline Widget */}
        <div 
          className="calendly-inline-widget rounded-lg overflow-hidden" 
          data-url="https://calendly.com/max-equityadvance/equity-advance-iso-partner-program"
          style={{ minWidth: '320px', height: '700px' }}
        />
      </div>
    </div>
  );
}
