import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import IsoPending from "./pages/IsoPending";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import TeamManagement from "./pages/TeamManagement";
import OfficerSignup from "./pages/OfficerSignup";
import { IsoLoginWidget } from "./components/IsoLoginWidget";
import { AdminRoute } from "./components/AdminRoute";
import { ManagerRoute } from "./components/ManagerRoute";
import { WizardProvider, useWizard } from "./contexts/WizardContext";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const { isWizardActive } = useWizard();
  const hideIsoWidget = 
    location.pathname === '/iso-pending' || 
    location.pathname === '/admin' || 
    location.pathname === '/reset-password' || 
    location.pathname === '/team' ||
    location.pathname.startsWith('/join/') ||
    isWizardActive;

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/iso-pending" element={<IsoPending />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/team" element={<ManagerRoute><TeamManagement /></ManagerRoute>} />
        <Route path="/join/:inviteToken" element={<OfficerSignup />} />
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
        <WizardProvider>
          <AppContent />
        </WizardProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
