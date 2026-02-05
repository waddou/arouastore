import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { POS } from "./pages/POS";
import { Repairs } from "./pages/Repairs";
import { Inventory } from "./pages/Inventory";
import { Customers } from "./pages/Customers";
import { UsersAdmin } from "./pages/UsersAdmin";
import { AdminConfig } from "./pages/AdminConfig";
import { AdminProfile } from "./pages/AdminProfile";
import { CurrencySettings } from "./pages/CurrencySettings";
import { StoreSettings } from "./pages/StoreSettings";
import { ProductManagement } from "./pages/ProductManagement";
import { DeviceBrandsManagement } from "./pages/DeviceBrandsManagement";
import { CashRegister } from "./pages/CashRegister";
import { Suppliers } from "./pages/Suppliers";
import { PurchaseOrders } from "./pages/PurchaseOrders";
import { Reports } from "./pages/Reports";
import { LoyaltySettings } from "./pages/LoyaltySettings";
import { LoginPage } from "./pages/LoginPage";
import { useAuthStore } from "./store/authStore";
import { client, api } from "./api/client";

/**
 * Redirects agent users to POS if a cash session is open, otherwise to CashRegister.
 */
function AgentDefaultRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCurrentCashSession()
      .then((session) => {
        setTarget(session ? "/pos" : "/cash-register");
      })
      .catch(() => {
        setTarget("/cash-register");
      });
  }, []);

  if (!target) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return <Navigate to={target} replace />;
}

function App() {
  const { user, isChecking, setUser, setChecking } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    // Zustand persist already restores user from localStorage
    // Only fetch role if user exists
    const currentUser = useAuthStore.getState().user;
    
    if (currentUser) {
      try {
        // Fetch user role from backend to ensure it's up to date
        const roleData = await api.getUserRole();
        useAuthStore.getState().setUserRole(roleData.role);
      } catch (e) {
        console.error("Failed to fetch user role:", e);
        // If role fetch fails, user might not be authenticated anymore
        // Clear the session
        useAuthStore.getState().reset();
      }
    }
    
    setChecking(false);
  }

  // Show Loading while isChecking to prevent flicker
  if (isChecking) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Not logged in - show login page
  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const isAgent = user?.role === "agent";
  const isAdminOrUndefined = user?.role === "admin" || user?.role === undefined;

  // Logged in - show dashboard
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          {/* Agent default: POS if cash session open, otherwise CashRegister */}
          {isAgent ? (
            <Route path="/" element={<AgentDefaultRedirect />} />
          ) : (
            <Route path="/" element={<Dashboard />} />
          )}
          <Route path="/pos" element={<POS />} />
          <Route path="/cash-register" element={<CashRegister />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/repairs" element={<Repairs />} />
          <Route path="/inventory" element={<Inventory />} />
          {/* Admin/Manager routes - not accessible to agents */}
          {!isAgent && <Route path="/dashboard" element={<Dashboard />} />}
          {/* Admin routes - accessible when role is admin or not set (first user) */}
          {isAdminOrUndefined && (
            <>
              <Route path="/admin" element={<AdminConfig />} />
              <Route path="/admin/users" element={<UsersAdmin />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/currency" element={<CurrencySettings />} />
              <Route path="/admin/store" element={<StoreSettings />} />
              <Route path="/admin/products" element={<ProductManagement />} />
              <Route
                path="/admin/device-brands"
                element={<DeviceBrandsManagement />}
              />
              <Route path="/admin/suppliers" element={<Suppliers />} />
              <Route
                path="/admin/purchase-orders"
                element={<PurchaseOrders />}
              />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/loyalty" element={<LoyaltySettings />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;
