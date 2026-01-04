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
import { BulkImportPage } from "@/pages/BulkImportPage";
import OfficerSignup from "./pages/OfficerSignup";
import Profile from "./pages/Profile";
import Pipeline from "./pages/Pipeline";
import { IsoLoginWidget } from "./components/IsoLoginWidget";
import { AdminRoute } from "./components/AdminRoute";
import { ManagerRoute } from "./components/ManagerRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navigate } from "react-router-dom";
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
    location.pathname === '/pipeline' ||
    location.pathname === '/bulk-import' ||
    location.pathname === '/profile' ||
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
        <Route path="/pipeline" element={<Pipeline />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/bulk-import" element={
          <ProtectedRoute>
            <BulkImportPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
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
