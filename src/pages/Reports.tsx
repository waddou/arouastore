import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Download,
  Calendar,
  ShoppingBag,
  Package,
  Wallet,
  Wrench,
} from "lucide-react";
import { api } from "../api/client";
import { useSettingsStore } from "./CurrencySettings";
import { exportToCSV } from "../utils/csv-export";
import {
  SalesReportData,
  InventoryReportData,
  CashSessionsReportData,
  RepairsReportData,
} from "../types";

type TabType = "sales" | "inventory" | "cash" | "repairs";

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "sales", label: "Ventes", icon: ShoppingBag },
  { id: "inventory", label: "Inventaire", icon: Package },
  { id: "cash", label: "Caisse", icon: Wallet },
  { id: "repairs", label: "Réparations", icon: Wrench },
];

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}
function defaultTo(): string {
  return new Date().toISOString().split("T")[0];
}

export const Reports = () => {
  const formatPrice = useSettingsStore((s) => s.formatPrice);
  const [activeTab, setActiveTab] = useState<TabType>("sales");
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [loading, setLoading] = useState(false);

  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null);
  const [cashData, setCashData] = useState<CashSessionsReportData | null>(null);
  const [repairsData, setRepairsData] = useState<RepairsReportData | null>(null);

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const generate = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "sales": {
          const data = await api.getSalesReport(from, to);
          setSalesData(data);
          break;
        }
        case "inventory": {
          const data = await api.getInventoryReport();
          setInventoryData(data);
          break;
        }
        case "cash": {
          const data = await api.getCashSessionsReport(from, to);
          setCashData(data);
          break;
        }
        case "repairs": {
          const data = await api.getRepairsReport(from, to);
          setRepairsData(data);
          break;
        }
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (activeTab === "sales" && salesData) {
      exportToCSV(
        salesData.sales.map((s) => ({
          id: s.id,
          client: s.customerName || "—",
          total: s.total,
          remise: s.discount,
          paiement: s.paymentMethod,
          vendeur: s.sellerName,
          date: formatDate(s.createdAt),
        })),
        `ventes-${from}-${to}.csv`,
        [
          { key: "id", header: "ID" },
          { key: "client", header: "Client" },
          { key: "total", header: "Total", format: (v) => String(v) },
          { key: "remise", header: "Remise", format: (v) => String(v) },
          { key: "paiement", header: "Paiement" },
          { key: "vendeur", header: "Vendeur" },
          { key: "date", header: "Date" },
        ],
      );
    } else if (activeTab === "inventory" && inventoryData) {
      exportToCSV(
        inventoryData.products.map((p) => ({
          sku: p.sku,
          nom: p.name,
          categorie: p.category,
          stock: p.stock,
          seuil: p.alertThreshold,
          prixAchat: p.pricePurchase,
          prixVente: p.priceSale,
          valeurStock: p.stockValue,
        })),
        `inventaire-${new Date().toISOString().split("T")[0]}.csv`,
        [
          { key: "sku", header: "SKU" },
          { key: "nom", header: "Produit" },
          { key: "categorie", header: "Catégorie" },
          { key: "stock", header: "Stock" },
          { key: "seuil", header: "Seuil alerte" },
          { key: "prixAchat", header: "Prix achat", format: (v) => String(v) },
          { key: "prixVente", header: "Prix vente", format: (v) => String(v) },
          { key: "valeurStock", header: "Valeur stock", format: (v) => String(v) },
        ],
      );
    } else if (activeTab === "cash" && cashData) {
      exportToCSV(
        cashData.sessions.map((s) => ({
          id: s.id,
          utilisateur: s.userName,
          ouverture: s.openingAmount,
          fermeture: s.closingAmount ?? "—",
          attendu: s.expectedAmount ?? "—",
          ecart: s.difference ?? "—",
          ouvertLe: formatDate(s.openedAt),
          fermeLe: s.closedAt ? formatDate(s.closedAt) : "—",
        })),
        `caisse-${from}-${to}.csv`,
        [
          { key: "id", header: "ID" },
          { key: "utilisateur", header: "Utilisateur" },
          { key: "ouverture", header: "Ouverture", format: (v) => String(v) },
          { key: "fermeture", header: "Fermeture", format: (v) => String(v) },
          { key: "attendu", header: "Attendu", format: (v) => String(v) },
          { key: "ecart", header: "Écart", format: (v) => String(v) },
          { key: "ouvertLe", header: "Ouvert le" },
          { key: "fermeLe", header: "Fermé le" },
        ],
      );
    } else if (activeTab === "repairs" && repairsData) {
      exportToCSV(
        repairsData.repairs.map((r) => ({
          id: r.id,
          client: r.customerName,
          appareil: `${r.deviceBrand} ${r.deviceModel}`,
          probleme: r.issueDescription,
          statut: r.status,
          coutEstime: r.estimatedCost,
          coutFinal: r.finalCost ?? "—",
          technicien: r.technicianName ?? "—",
          date: formatDate(r.createdAt),
        })),
        `reparations-${from}-${to}.csv`,
        [
          { key: "id", header: "ID" },
          { key: "client", header: "Client" },
          { key: "appareil", header: "Appareil" },
          { key: "probleme", header: "Problème" },
          { key: "statut", header: "Statut" },
          { key: "coutEstime", header: "Coût estimé", format: (v) => String(v) },
          { key: "coutFinal", header: "Coût final", format: (v) => String(v) },
          { key: "technicien", header: "Technicien" },
          { key: "date", header: "Date" },
        ],
      );
    }
  };

  const hasData =
    (activeTab === "sales" && salesData) ||
    (activeTab === "inventory" && inventoryData) ||
    (activeTab === "cash" && cashData) ||
    (activeTab === "repairs" && repairsData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-primary-600/20 rounded-xl">
            <BarChart3 className="text-primary-500" size={28} />
          </div>
          Rapports
        </h1>
        <p className="text-slate-400 mt-1">Générer et exporter des rapports détaillés</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary-400 border-b-2 border-primary-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {activeTab !== "inventory" && (
          <>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-dark-surface border border-dark-border rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-primary-500"
              />
              <span className="text-slate-500">à</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-dark-surface border border-dark-border rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <BarChart3 size={16} />
          )}
          Générer
        </button>
        {hasData && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            <Download size={16} />
            Exporter CSV
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* ── SALES ── */}
          {activeTab === "sales" && salesData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Ventes", value: salesData.summary.totalSales, fmt: false },
                  { label: "Chiffre d'affaires", value: salesData.summary.totalRevenue, fmt: true },
                  { label: "Remises", value: salesData.summary.totalDiscount, fmt: true },
                  { label: "Ticket moyen", value: salesData.summary.averageTicket, fmt: true },
                ].map((stat) => (
                  <div key={stat.label} className="bg-dark-surface rounded-xl border border-dark-border p-4">
                    <p className="text-slate-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stat.fmt ? formatPrice(stat.value) : stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Top products */}
              {salesData.topProducts.length > 0 && (
                <div className="bg-dark-surface rounded-xl border border-dark-border p-6">
                  <h3 className="text-white font-semibold mb-4">Top produits</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-border">
                        <th className="text-left text-slate-400 pb-3">Produit</th>
                        <th className="text-center text-slate-400 pb-3">Vendus</th>
                        <th className="text-right text-slate-400 pb-3">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.topProducts.map((p) => (
                        <tr key={p.productId} className="border-b border-dark-border/50">
                          <td className="py-2 text-white">{p.productName}</td>
                          <td className="py-2 text-center text-slate-300">{p.quantitySold}</td>
                          <td className="py-2 text-right text-primary-400 font-medium">{formatPrice(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sales list */}
              <div className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="px-4 py-3 text-left text-slate-400">ID</th>
                      <th className="px-4 py-3 text-left text-slate-400">Client</th>
                      <th className="px-4 py-3 text-right text-slate-400">Total</th>
                      <th className="px-4 py-3 text-left text-slate-400">Paiement</th>
                      <th className="px-4 py-3 text-left text-slate-400">Vendeur</th>
                      <th className="px-4 py-3 text-left text-slate-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-dark-border/50">
                        <td className="px-4 py-3 text-white">#{sale.id}</td>
                        <td className="px-4 py-3 text-slate-300">{sale.customerName || "—"}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatPrice(sale.total)}</td>
                        <td className="px-4 py-3 text-slate-300">{sale.paymentMethod}</td>
                        <td className="px-4 py-3 text-slate-300">{sale.sellerName}</td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(sale.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── INVENTORY ── */}
          {activeTab === "inventory" && inventoryData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Produits actifs", value: inventoryData.summary.activeProducts, fmt: false },
                  { label: "Valeur du stock", value: inventoryData.summary.totalStockValue, fmt: true },
                  { label: "Valeur de vente", value: inventoryData.summary.totalRetailValue, fmt: true },
                  { label: "Ruptures de stock", value: inventoryData.summary.outOfStockCount, fmt: false },
                  { label: "Stock bas", value: inventoryData.summary.lowStockCount, fmt: false },
                ].map((stat) => (
                  <div key={stat.label} className="bg-dark-surface rounded-xl border border-dark-border p-4">
                    <p className="text-slate-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stat.fmt ? formatPrice(stat.value) : stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Low stock alert */}
              {inventoryData.lowStockProducts.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
                  <h3 className="text-amber-400 font-semibold mb-4">Produits en stock bas</h3>
                  <div className="space-y-2">
                    {inventoryData.lowStockProducts.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm">
                        <span className="text-white">{p.name} <span className="text-slate-500">({p.sku})</span></span>
                        <span className="text-amber-400">{p.stock} / seuil {p.alertThreshold}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products table */}
              <div className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="px-4 py-3 text-left text-slate-400">SKU</th>
                      <th className="px-4 py-3 text-left text-slate-400">Produit</th>
                      <th className="px-4 py-3 text-left text-slate-400">Catégorie</th>
                      <th className="px-4 py-3 text-center text-slate-400">Stock</th>
                      <th className="px-4 py-3 text-right text-slate-400">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.products.slice(0, 50).map((p) => (
                      <tr key={p.id} className={`border-b border-dark-border/50 ${p.isLowStock ? "bg-amber-500/5" : ""}`}>
                        <td className="px-4 py-3 text-slate-400">{p.sku}</td>
                        <td className="px-4 py-3 text-white">{p.name}</td>
                        <td className="px-4 py-3 text-slate-300">{p.category}</td>
                        <td className={`px-4 py-3 text-center ${p.isLowStock ? "text-amber-400" : "text-slate-300"}`}>{p.stock}</td>
                        <td className="px-4 py-3 text-right text-white">{formatPrice(p.stockValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CASH SESSIONS ── */}
          {activeTab === "cash" && cashData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Sessions", value: cashData.summary.totalSessions, fmt: false },
                  { label: "Total ouvertures", value: cashData.summary.totalOpeningAmount, fmt: true },
                  { label: "Total fermetures", value: cashData.summary.totalClosingAmount, fmt: true },
                  { label: "Écarts", value: cashData.summary.sessionsWithDiscrepancy, fmt: false },
                ].map((stat) => (
                  <div key={stat.label} className="bg-dark-surface rounded-xl border border-dark-border p-4">
                    <p className="text-slate-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stat.fmt ? formatPrice(stat.value) : stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="px-4 py-3 text-left text-slate-400">ID</th>
                      <th className="px-4 py-3 text-left text-slate-400">Utilisateur</th>
                      <th className="px-4 py-3 text-right text-slate-400">Ouverture</th>
                      <th className="px-4 py-3 text-right text-slate-400">Fermeture</th>
                      <th className="px-4 py-3 text-right text-slate-400">Attendu</th>
                      <th className="px-4 py-3 text-right text-slate-400">Écart</th>
                      <th className="px-4 py-3 text-left text-slate-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashData.sessions.map((s) => (
                      <tr key={s.id} className="border-b border-dark-border/50">
                        <td className="px-4 py-3 text-white">#{s.id}</td>
                        <td className="px-4 py-3 text-slate-300">{s.userName}</td>
                        <td className="px-4 py-3 text-right text-white">{formatPrice(s.openingAmount)}</td>
                        <td className="px-4 py-3 text-right text-white">{s.closingAmount != null ? formatPrice(s.closingAmount) : "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{s.expectedAmount != null ? formatPrice(s.expectedAmount) : "—"}</td>
                        <td className={`px-4 py-3 text-right font-medium ${s.difference && s.difference !== 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {s.difference != null ? formatPrice(s.difference) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(s.openedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REPAIRS ── */}
          {activeTab === "repairs" && repairsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Réparations", value: repairsData.summary.totalRepairs, fmt: false },
                  { label: "Revenue", value: repairsData.summary.totalRevenue, fmt: true },
                  { label: "Coût moyen", value: repairsData.summary.averageCost, fmt: true },
                  { label: "Durée moy. (jours)", value: repairsData.summary.averageCompletionDays, fmt: false },
                ].map((stat) => (
                  <div key={stat.label} className="bg-dark-surface rounded-xl border border-dark-border p-4">
                    <p className="text-slate-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stat.fmt ? formatPrice(stat.value) : stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* By technician */}
              {repairsData.byTechnician.length > 0 && (
                <div className="bg-dark-surface rounded-xl border border-dark-border p-6">
                  <h3 className="text-white font-semibold mb-4">Par technicien</h3>
                  <div className="space-y-2">
                    {repairsData.byTechnician.map((t) => (
                      <div key={t.technicianId} className="flex justify-between text-sm">
                        <span className="text-white">{t.technicianName}</span>
                        <span className="text-slate-300">{t.repairCount} réparations — {formatPrice(t.totalRevenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Repairs list */}
              <div className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="px-4 py-3 text-left text-slate-400">ID</th>
                      <th className="px-4 py-3 text-left text-slate-400">Client</th>
                      <th className="px-4 py-3 text-left text-slate-400">Appareil</th>
                      <th className="px-4 py-3 text-left text-slate-400">Statut</th>
                      <th className="px-4 py-3 text-right text-slate-400">Coût</th>
                      <th className="px-4 py-3 text-left text-slate-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairsData.repairs.map((r) => (
                      <tr key={r.id} className="border-b border-dark-border/50">
                        <td className="px-4 py-3 text-white">#{r.id}</td>
                        <td className="px-4 py-3 text-slate-300">{r.customerName}</td>
                        <td className="px-4 py-3 text-slate-300">{r.deviceBrand} {r.deviceModel}</td>
                        <td className="px-4 py-3 text-slate-300">{r.status}</td>
                        <td className="px-4 py-3 text-right text-white">{formatPrice(r.finalCost ?? r.estimatedCost)}</td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No data message */}
          {!hasData && !loading && (
            <div className="bg-dark-surface rounded-2xl border border-dark-border p-12 text-center">
              <BarChart3 size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-500">Cliquez sur "Générer" pour afficher le rapport</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
