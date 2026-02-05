import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  Package,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Wallet,
  Users,
  Truck,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { client } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { NotificationBell } from "../components/notifications/NotificationBell";
import { NotificationPanel } from "../components/notifications/NotificationPanel";
import { useNotificationStore } from "../store/notificationStore";

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, reset } = useAuthStore();
  const { startPolling, stopPolling } = useNotificationStore();

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const handleLogout = async () => {
    stopPolling();
    await client.auth.signOut();
    reset();
  };

  // Show admin menu for admin role (first user is auto-admin)
  const isAdmin = user?.role === "admin" || user?.role === undefined;
  const isAgent = user?.role === "agent";

  const allNavItems = [
    {
      icon: LayoutDashboard,
      label: "Tableau de bord",
      path: "/",
      hideForAgent: true,
    },
    { icon: ShoppingCart, label: "Caisse (POS)", path: "/pos" },
    { icon: Wallet, label: "Gestion Caisse", path: "/cash-register" },
    { icon: Users, label: "Clients", path: "/customers" },
    { icon: Wrench, label: "Réparations", path: "/repairs" },
    { icon: Package, label: "Stock", path: "/inventory" },
    {
      icon: Truck,
      label: "Fournisseurs",
      path: "/admin/suppliers",
      hideForAgent: true,
    },
    {
      icon: ClipboardList,
      label: "Bons de commande",
      path: "/admin/purchase-orders",
      hideForAgent: true,
    },
    {
      icon: BarChart3,
      label: "Rapports",
      path: "/admin/reports",
      hideForAgent: true,
    },
    {
      icon: Settings,
      label: "Administration",
      path: "/admin",
      hideForAgent: true,
    },
  ];

  const navItems = allNavItems.filter((item) => !isAgent || !item.hideForAgent);

  return (
    <div className="flex h-screen bg-dark-bg text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        className="bg-dark-surface border-r border-dark-border flex flex-col relative"
        animate={{ width: collapsed ? 80 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 z-10 bg-dark-surface border border-dark-border rounded-full p-1.5 hover:bg-primary-600 hover:border-primary-600 transition-all"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-6 overflow-hidden">
          <AnimatePresence mode="wait">
            {collapsed ? (
              <motion.h1
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-2xl font-bold text-primary-500 text-center"
              >
                PS
              </motion.h1>
            ) : (
              <motion.h1
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent whitespace-nowrap"
              >
                PhoneStore
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <div
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-900/20"
                      : "text-slate-400 hover:bg-dark-border hover:text-white",
                    collapsed && "justify-center px-3",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-dark-border">
          <button
            onClick={handleLogout}
            className={clsx(
              "flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 transition-colors rounded-xl",
              collapsed && "justify-center px-3",
            )}
            title={collapsed ? "Déconnexion" : undefined}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Déconnexion
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top bar with notification bell */}
        <div className="flex items-center justify-end px-8 pt-4 pb-0">
          <div className="relative">
            <NotificationBell onClick={() => setNotifOpen(!notifOpen)} />
            <NotificationPanel
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
            />
          </div>
        </div>
        <div className="flex-1 p-8 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
