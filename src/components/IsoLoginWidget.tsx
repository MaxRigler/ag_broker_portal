import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export function IsoLoginWidget() {
  const handleClick = () => {
    // Placeholder - future: navigate to login page or open modal
    console.log('ISO Login clicked');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        variant="navy" 
        size="lg"
        onClick={handleClick}
        className="shadow-lg hover:shadow-xl"
      >
        <LogIn className="w-4 h-4" />
        ISO Login
      </Button>
    </div>
  );
}
