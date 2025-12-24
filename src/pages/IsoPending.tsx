import { useEffect } from 'react';

export default function IsoPending() {
  useEffect(() => {
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
  }, []);

  return (
    <div 
      className="calendly-inline-widget w-full min-h-screen" 
      data-url="https://calendly.com/max-equityadvance/equity-advance-iso-partner-program"
      style={{ height: '100vh' }}
    />
  );
}
