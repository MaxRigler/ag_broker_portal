import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, ArrowLeft } from 'lucide-react';
import logoBlue from '@/assets/logo-blue.png';

export default function IsoPending() {
  const [showCalendly, setShowCalendly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (showCalendly) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
        if (existingScript) {
          document.body.removeChild(existingScript);
        }
      };
    }
  }, [showCalendly]);

  if (showCalendly) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4">
          <Button 
            variant="ghost" 
            onClick={() => setShowCalendly(false)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div 
          className="calendly-inline-widget w-full" 
          data-url="https://calendly.com/max-equityadvance/equity-advance-iso-partner-program"
          style={{ height: 'calc(100vh - 80px)' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <img 
          src={logoBlue} 
          alt="Equity Advance" 
          className="h-12 mx-auto"
        />
        
        <div className="flex items-center justify-center gap-2 text-amber-600">
          <Clock className="h-5 w-5" />
          <span className="font-semibold">Account Status: Pending</span>
        </div>
        
        <p className="text-muted-foreground">
          In order to activate your account, click the button below to book a demo call 
          to go over best practices when offering clients funding via a home equity investment.
        </p>
        
        <Button 
          onClick={() => setShowCalendly(true)}
          className="w-full"
          size="lg"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Book Demo Call
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to Home
        </Button>
      </div>
    </div>
  );
}
