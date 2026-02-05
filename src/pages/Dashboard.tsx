import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { TrendingUp, Users, Wrench, AlertCircle, Package } from 'lucide-react';
import { useSettingsStore } from './CurrencySettings';

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ElementType; color: string }) => (
  <div className={`bg-dark-surface p-6 rounded-2xl border border-dark-border hover:border-${color}-500/50 transition-all duration-300 group`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500 group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  const { sales, dashboardStats, fetchDashboardStats, fetchSales, isLoading } = useStore();
  const formatPrice = useSettingsStore((s) => s.formatPrice);

  useEffect(() => {
    fetchDashboardStats();
    fetchSales(10);
  }, [fetchDashboardStats, fetchSales]);

  const activeRepairs = dashboardStats?.repairs 
    ? (dashboardStats.repairs['new'] || 0) + (dashboardStats.repairs['diagnostic'] || 0) + (dashboardStats.repairs['repair'] || 0)
    : 0;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Bonjour, Admin 👋</h2>
        <p className="text-slate-400">Voici ce qui se passe dans votre boutique aujourd'hui.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Chiffre d'affaires (jour)" 
          value={formatPrice(dashboardStats?.salesToday.total || 0)} 
          icon={TrendingUp} 
          color="emerald" 
        />
        <StatCard 
          title="Réparations en cours" 
          value={activeRepairs} 
          icon={Wrench} 
          color="blue" 
        />
        <StatCard 
          title="Total Clients" 
          value={dashboardStats?.totalCustomers || 0} 
          icon={Users} 
          color="purple" 
        />
        <StatCard 
          title="Alertes Stock" 
          value={dashboardStats?.lowStockCount || 0} 
          icon={AlertCircle} 
          color="rose" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-xl font-bold text-white mb-4">Ventes Récentes</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : sales.length === 0 ? (
            <p className="text-slate-500">Aucune vente récente.</p>
          ) : (
            <div className="space-y-4">
              {sales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex justify-between items-center p-4 bg-dark-bg rounded-xl">
                  <div>
                    <p className="text-white font-medium">Vente #{sale.id}</p>
                    <p className="text-slate-500 text-sm">
                      {sale.createdAt ? new Date(sale.createdAt * 1000).toLocaleString('fr-FR') : '-'}
                    </p>
                  </div>
                  <span className={`font-bold ${sale.status === 'completed' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {sale.status === 'completed' ? '+' : '-'}{formatPrice(sale.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-xl font-bold text-white mb-4">Réparations par Statut</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { status: 'new', label: 'Nouvelles', color: 'bg-yellow-500' },
                { status: 'diagnostic', label: 'Diagnostic', color: 'bg-blue-500' },
                { status: 'repair', label: 'En réparation', color: 'bg-purple-500' },
                { status: 'delivered', label: 'Livrées', color: 'bg-emerald-500' },
              ].map(({ status, label, color }) => (
                <div key={status} className="flex items-center justify-between p-3 bg-dark-bg rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${color}`}></div>
                    <span className="text-white">{label}</span>
                  </div>
                  <span className="text-slate-400 font-medium">
                    {dashboardStats?.repairs[status] || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
