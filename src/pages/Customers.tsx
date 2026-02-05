import React, { useEffect, useState } from "react";
import {
  Search,
  User,
  Phone,
  Calendar,
  ShoppingBag,
  Wrench,
  X,
  ChevronRight,
  Package,
  CreditCard,
  Edit2,
  Save,
  FileText,
  Mail,
  MapPin,
  Star,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { useSettingsStore } from "./CurrencySettings";
import { api } from "../api/client";
import { Customer, Sale, Repair, CustomerLoyaltyData } from "../types";

interface SaleWithItems extends Sale {
  items: Array<{
    id: number;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    productName: string | null;
  }>;
}

interface CustomerHistory {
  customer: Customer;
  sales: SaleWithItems[];
  repairs: Repair[];
}

type TabType = "info" | "sales" | "repairs";

export const Customers = () => {
  const { customers, fetchCustomers, isLoading } = useStore();
  const formatPrice = useSettingsStore((s) => s.formatPrice);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("info");

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<CustomerLoyaltyData | null>(
    null,
  );

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm),
  );

  const handleViewHistory = async (customer: Customer) => {
    setLoadingHistory(true);
    setIsEditing(false);
    setSaveSuccess(false);
    setLoyaltyData(null);
    try {
      const [history, loyalty] = await Promise.all([
        api.getCustomerHistory(customer.id),
        api.getCustomerLoyalty(customer.id).catch(() => null),
      ]);
      setSelectedCustomer(history);
      setLoyaltyData(loyalty);
      setActiveTab("info");
      // Initialize edit fields
      setEditName(history.customer.name);
      setEditPhone(history.customer.phone);
      setEditEmail("");
      setEditAddress("");
      setEditNotes("");
    } catch (error) {
      console.error("Error loading customer history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer || !editName.trim() || !editPhone.trim()) return;

    setSaving(true);
    try {
      const updated = await api.updateCustomer(selectedCustomer.customer.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
      });

      // Update local state
      setSelectedCustomer({
        ...selectedCustomer,
        customer: {
          ...selectedCustomer.customer,
          name: editName.trim(),
          phone: editPhone.trim(),
        },
      });

      // Refresh customers list
      await fetchCustomers();

      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating customer:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (selectedCustomer) {
      setEditName(selectedCustomer.customer.name);
      setEditPhone(selectedCustomer.customer.phone);
    }
    setIsEditing(false);
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "—";
    return new Date(timestamp * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (timestamp: number | null) => {
    if (!timestamp) return "—";
    return new Date(timestamp * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getRepairStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: "Nouveau",
      diagnostic: "Diagnostic",
      repair: "En réparation",
      delivered: "Livré",
    };
    return labels[status] || status;
  };

  const getRepairStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500/20 text-blue-400",
      diagnostic: "bg-amber-500/20 text-amber-400",
      repair: "bg-purple-500/20 text-purple-400",
      delivered: "bg-emerald-500/20 text-emerald-400",
    };
    return colors[status] || "bg-slate-500/20 text-slate-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Clients</h1>
          <p className="text-slate-400 mt-1">
            {customers.length} clients enregistrés
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Rechercher par nom ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-surface border border-dark-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.length === 0 ? (
            <div className="bg-dark-surface rounded-2xl border border-dark-border p-12 text-center">
              <User size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-500">Aucun client trouvé</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleViewHistory(customer)}
                className="bg-dark-surface rounded-xl border border-dark-border p-4 flex items-center gap-4 cursor-pointer hover:border-primary-500 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                  <User size={24} className="text-primary-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium">{customer.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {customer.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      Client depuis{" "}
                      {formatDate(customer.createdAt)?.split(",")[0]}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-primary-400 font-bold">
                    {formatPrice(customer.totalSpent)}
                  </p>
                  <p className="text-xs text-slate-500">Total dépensé</p>
                </div>

                <ChevronRight
                  size={20}
                  className="text-slate-600 group-hover:text-primary-400 transition-colors"
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Customer History Modal */}
      {(selectedCustomer || loadingHistory) && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => !loadingHistory && setSelectedCustomer(null)}
        >
          <div
            className="bg-dark-surface rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingHistory ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              selectedCustomer && (
                <>
                  {/* Modal Header */}
                  <div className="p-6 border-b border-dark-border">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-primary-600/20 flex items-center justify-center">
                          <User size={28} className="text-primary-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">
                            {selectedCustomer.customer.name}
                          </h2>
                          <p className="text-slate-400">
                            {selectedCustomer.customer.phone}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                      <div className="bg-dark-bg rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-white">
                          {formatPrice(selectedCustomer.customer.totalSpent)}
                        </p>
                        <p className="text-sm text-slate-400">Total dépensé</p>
                      </div>
                      <div className="bg-dark-bg rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-primary-400">
                          {selectedCustomer.sales.length}
                        </p>
                        <p className="text-sm text-slate-400">Achats</p>
                      </div>
                      <div className="bg-dark-bg rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-amber-400">
                          {selectedCustomer.repairs.length}
                        </p>
                        <p className="text-sm text-slate-400">Réparations</p>
                      </div>
                      <div className="bg-dark-bg rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-400">
                          {loyaltyData?.loyaltyPoints ?? 0}
                        </p>
                        <p className="text-sm text-slate-400">
                          Points fidélité
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-dark-border">
                    <button
                      onClick={() => setActiveTab("info")}
                      className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === "info" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:text-white"}`}
                    >
                      <FileText size={18} className="inline mr-2" />
                      Fiche client
                    </button>
                    <button
                      onClick={() => setActiveTab("sales")}
                      className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === "sales" ? "text-primary-400 border-b-2 border-primary-400" : "text-slate-400 hover:text-white"}`}
                    >
                      <ShoppingBag size={18} className="inline mr-2" />
                      Achats ({selectedCustomer.sales.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("repairs")}
                      className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === "repairs" ? "text-amber-400 border-b-2 border-amber-400" : "text-slate-400 hover:text-white"}`}
                    >
                      <Wrench size={18} className="inline mr-2" />
                      Réparations ({selectedCustomer.repairs.length})
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === "info" ? (
                      <div className="space-y-6">
                        {/* Success message */}
                        {saveSuccess && (
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                            <Save size={20} className="text-emerald-400" />
                            <p className="text-emerald-400">
                              Modifications enregistrées avec succès
                            </p>
                          </div>
                        )}

                        {/* Edit/View Mode Toggle */}
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-white">
                            Informations du client
                          </h3>
                          {!isEditing ? (
                            <button
                              onClick={() => setIsEditing(true)}
                              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                              Modifier
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 bg-dark-bg border border-dark-border text-slate-400 hover:text-white rounded-lg transition-colors"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={handleSaveCustomer}
                                disabled={
                                  saving ||
                                  !editName.trim() ||
                                  !editPhone.trim()
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                              >
                                {saving ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <Save size={16} />
                                )}
                                Enregistrer
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Customer Info Form */}
                        <div className="bg-dark-bg rounded-xl p-6 space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Name */}
                            <div>
                              <label className="block text-slate-400 text-sm mb-2">
                                <User size={14} className="inline mr-2" />
                                Nom complet
                              </label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-dark-surface border border-dark-border rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                                  placeholder="Nom du client"
                                />
                              ) : (
                                <p className="text-white text-lg py-3">
                                  {selectedCustomer.customer.name}
                                </p>
                              )}
                            </div>

                            {/* Phone */}
                            <div>
                              <label className="block text-slate-400 text-sm mb-2">
                                <Phone size={14} className="inline mr-2" />
                                Téléphone
                              </label>
                              {isEditing ? (
                                <input
                                  type="tel"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  className="w-full bg-dark-surface border border-dark-border rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                                  placeholder="Numéro de téléphone"
                                />
                              ) : (
                                <p className="text-white text-lg py-3">
                                  {selectedCustomer.customer.phone}
                                </p>
                              )}
                            </div>

                            {/* Email (optional field for future) */}
                            <div>
                              <label className="block text-slate-400 text-sm mb-2">
                                <Mail size={14} className="inline mr-2" />
                                Email (optionnel)
                              </label>
                              {isEditing ? (
                                <input
                                  type="email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  className="w-full bg-dark-surface border border-dark-border rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                                  placeholder="email@exemple.com"
                                />
                              ) : (
                                <p className="text-slate-500 text-lg py-3">
                                  {editEmail || "—"}
                                </p>
                              )}
                            </div>

                            {/* Address (optional field for future) */}
                            <div>
                              <label className="block text-slate-400 text-sm mb-2">
                                <MapPin size={14} className="inline mr-2" />
                                Adresse (optionnel)
                              </label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editAddress}
                                  onChange={(e) =>
                                    setEditAddress(e.target.value)
                                  }
                                  className="w-full bg-dark-surface border border-dark-border rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                                  placeholder="Adresse du client"
                                />
                              ) : (
                                <p className="text-slate-500 text-lg py-3">
                                  {editAddress || "—"}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-slate-400 text-sm mb-2">
                              Notes internes
                            </label>
                            {isEditing ? (
                              <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                rows={3}
                                className="w-full bg-dark-surface border border-dark-border rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary-500 resize-none"
                                placeholder="Notes sur le client..."
                              />
                            ) : (
                              <p className="text-slate-500 py-3">
                                {editNotes || "Aucune note"}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="bg-dark-bg rounded-xl p-6">
                          <h4 className="text-white font-medium mb-4">
                            Informations supplémentaires
                          </h4>
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between py-2 border-b border-dark-border">
                              <span className="text-slate-400">
                                Client depuis
                              </span>
                              <span className="text-white">
                                {formatDateShort(
                                  selectedCustomer.customer.createdAt,
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-dark-border">
                              <span className="text-slate-400">
                                Première visite
                              </span>
                              <span className="text-white">
                                {formatDateShort(
                                  selectedCustomer.customer.firstVisit,
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-dark-border">
                              <span className="text-slate-400">
                                Total dépensé
                              </span>
                              <span className="text-primary-400 font-medium">
                                {formatPrice(
                                  selectedCustomer.customer.totalSpent,
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-dark-border">
                              <span className="text-slate-400">
                                Nombre de visites
                              </span>
                              <span className="text-white">
                                {selectedCustomer.sales.length +
                                  selectedCustomer.repairs.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : activeTab === "sales" ? (
                      <div className="space-y-4">
                        {selectedCustomer.sales.length === 0 ? (
                          <div className="text-center py-12 text-slate-500">
                            <ShoppingBag
                              size={48}
                              className="mx-auto mb-4 opacity-50"
                            />
                            <p>Aucun achat enregistré</p>
                          </div>
                        ) : (
                          selectedCustomer.sales.map((sale) => (
                            <div
                              key={sale.id}
                              className="bg-dark-bg rounded-xl p-4 border border-dark-border"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="text-white font-medium">
                                    Vente #{sale.id}
                                  </p>
                                  <p className="text-slate-500 text-sm">
                                    {formatDate(sale.createdAt)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-primary-400 font-bold">
                                    {formatPrice(sale.total)}
                                  </p>
                                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                    <CreditCard size={12} />
                                    {sale.paymentMethod === "cash"
                                      ? "Espèces"
                                      : sale.paymentMethod === "card"
                                        ? "Carte"
                                        : "Mobile"}
                                  </div>
                                </div>
                              </div>

                              {/* Sale Items */}
                              <div className="space-y-2 border-t border-dark-border pt-3">
                                {sale.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-3 text-sm"
                                  >
                                    <Package
                                      size={14}
                                      className="text-slate-500"
                                    />
                                    <span className="flex-1 text-slate-300">
                                      {item.productName || "Produit inconnu"}
                                    </span>
                                    <span className="text-slate-500">
                                      x{item.quantity}
                                    </span>
                                    <span className="text-white">
                                      {formatPrice(item.subtotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {sale.discount > 0 && (
                                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-dark-border">
                                  <span className="text-amber-400">
                                    Remise appliquée
                                  </span>
                                  <span className="text-amber-400">
                                    -{formatPrice(sale.discount)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedCustomer.repairs.length === 0 ? (
                          <div className="text-center py-12 text-slate-500">
                            <Wrench
                              size={48}
                              className="mx-auto mb-4 opacity-50"
                            />
                            <p>Aucune réparation enregistrée</p>
                          </div>
                        ) : (
                          selectedCustomer.repairs.map((repair) => (
                            <div
                              key={repair.id}
                              className="bg-dark-bg rounded-xl p-4 border border-dark-border"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="text-white font-medium">
                                    {repair.deviceBrand} {repair.deviceModel}
                                  </p>
                                  <p className="text-slate-500 text-sm">
                                    {formatDate(repair.createdAt)}
                                  </p>
                                </div>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${getRepairStatusColor(repair.status)}`}
                                >
                                  {getRepairStatusLabel(repair.status)}
                                </span>
                              </div>

                              <p className="text-slate-400 text-sm mb-3">
                                {repair.issueDescription}
                              </p>

                              <div className="flex justify-between items-center pt-3 border-t border-dark-border">
                                <div className="text-sm">
                                  <span className="text-slate-500">
                                    Estimation:
                                  </span>
                                  <span className="text-white ml-2">
                                    {formatPrice(repair.estimatedCost)}
                                  </span>
                                </div>
                                {repair.finalCost !== null && (
                                  <div className="text-sm">
                                    <span className="text-slate-500">
                                      Final:
                                    </span>
                                    <span className="text-primary-400 ml-2 font-medium">
                                      {formatPrice(repair.finalCost)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
