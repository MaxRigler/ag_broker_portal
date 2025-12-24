import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import IsoPending from "./pages/IsoPending";
import { IsoLoginWidget } from "./components/IsoLoginWidget";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const hideIsoWidget = location.pathname === '/iso-pending';

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/iso-pending" element={<IsoPending />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideIsoWidget && <IsoLoginWidget />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
