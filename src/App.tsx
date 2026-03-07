import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { RestaurantProvider } from "@/context/RestaurantContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import SubscriptionGate from "@/components/SubscriptionGate";
import LandingPage from "./pages/LandingPage";
import Signup from "./pages/Signup";
import CustomerMenu from "./pages/CustomerMenu";
import StaffLogin from "./pages/StaffLogin";
import KitchenDashboard from "./pages/KitchenDashboard";
import BillingDashboard from "./pages/BillingDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/** Wraps a customer menu with RestaurantProvider using URL slug */
const CustomerMenuWrapper = () => {
  const { slug, tableNumber } = useParams();
  return (
    <RestaurantProvider slug={slug} tableNumber={tableNumber}>
      <CustomerMenu />
    </RestaurantProvider>
  );
};

/** Legacy route support - restaurantId based */
const LegacyCustomerMenuWrapper = () => {
  const { restaurantId, tableNumber } = useParams();
  return (
    <RestaurantProvider restaurantId={restaurantId} tableNumber={tableNumber}>
      <CustomerMenu />
    </RestaurantProvider>
  );
};

/** Wraps staff dashboards with RestaurantProvider using auth restaurantId */
const StaffDashboardWrapper = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: ('owner' | 'kitchen' | 'billing' | 'super_admin')[];
}) => {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <SubscriptionGate>
        <StaffRestaurantProvider>{children}</StaffRestaurantProvider>
      </SubscriptionGate>
    </ProtectedRoute>
  );
};

const StaffRestaurantProvider = ({ children }: { children: React.ReactNode }) => {
  const { restaurantId } = useAuth();
  return (
    <RestaurantProvider restaurantId={restaurantId}>
      {children}
    </RestaurantProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            {/* New slug-based QR route */}
            <Route path="/r/:slug/t/:tableNumber" element={<CustomerMenuWrapper />} />
            {/* Legacy UUID-based route for backwards compat */}
            <Route path="/order/:restaurantId/:tableNumber" element={<LegacyCustomerMenuWrapper />} />
            <Route path="/kitchen" element={
              <StaffDashboardWrapper allowedRoles={['kitchen', 'owner']}>
                <KitchenDashboard />
              </StaffDashboardWrapper>
            } />
            <Route path="/billing" element={
              <StaffDashboardWrapper allowedRoles={['billing', 'owner']}>
                <BillingDashboard />
              </StaffDashboardWrapper>
            } />
            <Route path="/owner" element={
              <StaffDashboardWrapper allowedRoles={['owner']}>
                <OwnerDashboard />
              </StaffDashboardWrapper>
            } />
            <Route path="/super-admin" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
