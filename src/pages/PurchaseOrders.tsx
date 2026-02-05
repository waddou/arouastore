import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Search,
  X,
  Package,
  Truck,
  Check,
  XCircle,
  ChevronRight,
  Minus,
} from "lucide-react";
import { api } from "../api/client";
import { useSettingsStore } from "./CurrencySettings";
import {
  PurchaseOrder,
  PurchaseOrderDetail,
  PurchaseOrderStatus,
  Supplier,
  Product,
  ReceiveItem,
} from "../types";

const statusConfig: Record<
  PurchaseOrderStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: "En attente",
    badgeClass: "bg-amber-500/20 text-amber-400",
  },
  partially_received: {
    label: "Partiellement reçu",
    badgeClass: "bg-blue-500/20 text-blue-400",
  },
  received: { label: "Reçu", badgeClass: "bg-emerald-500/20 text-emerald-400" },
  cancelled: { label: "Annulé", badgeClass: "bg-rose-500/20 text-rose-400" },
};

interface OrderLine {
  productId: number;
  productName: string;
  quantityOrdered: number;
}

export const PurchaseOrders = () => {
  const formatPrice = useSettingsStore((s) => s.formatPrice);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSupplierId, setNewSupplierId] = useState(0);
  const [newNotes, setNewNotes] = useState("");
  const [newLines, setNewLines] = useState<OrderLine[]>([]);

  // Detail modal
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Receive modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, suppliersData, productsData] = await Promise.all([
        api.getPurchaseOrders(),
        api.getSuppliers(),
        api.getProducts(),
      ]);
      setOrders(ordersData);
      setSuppliers(suppliersData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = !statusFilter || o.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // Create order
  const addLine = () => {
    setNewLines([
      ...newLines,
      { productId: 0, productName: "", quantityOrdered: 1 },
    ]);
  };

  const updateLine = (index: number, field: string, value: number | string) => {
    const updated = [...newLines];
    if (field === "productId") {
      const product = products.find((p) => p.id === Number(value));
      updated[index] = {
        ...updated[index],
        productId: Number(value),
        productName: product?.name || "",
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setNewLines(updated);
  };

  const removeLine = (index: number) => {
    setNewLines(newLines.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!newSupplierId || newLines.length === 0) return;
    const validLines = newLines.filter(
      (l) => l.productId > 0 && l.quantityOrdered > 0,
    );
    if (validLines.length === 0) return;
    try {
      await api.createPurchaseOrder({
        supplierId: newSupplierId,
        notes: newNotes || undefined,
        items: validLines.map((l) => ({
          productId: l.productId,
          quantityOrdered: l.quantityOrdered,
        })),
      });
      setShowCreateModal(false);
      setNewSupplierId(0);
      setNewNotes("");
      setNewLines([]);
      await loadData();
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  // View detail
  const openDetail = async (id: number) => {
    try {
      const data = await api.getPurchaseOrder(id);
      setDetail(data);
      setShowDetail(true);
    } catch (error) {
      console.error("Error loading order detail:", error);
    }
  };

  // Receive
  const openReceive = () => {
    if (!detail) return;
    setReceiveItems(
      detail.items.map((item) => ({
        itemId: item.id,
        quantityReceived: item.quantityOrdered - item.quantityReceived,
      })),
    );
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!detail) return;
    try {
      await api.receivePurchaseOrder(detail.id, receiveItems);
      setShowReceiveModal(false);
      setShowDetail(false);
      setDetail(null);
      await loadData();
    } catch (error) {
      console.error("Error receiving order:", error);
    }
  };

  // Cancel
  const handleCancel = async () => {
    if (!detail) return;
    try {
      await api.cancelPurchaseOrder(detail.id);
      setShowDetail(false);
      setDetail(null);
      await loadData();
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-primary-600/20 rounded-xl">
              <ClipboardList className="text-primary-500" size={28} />
            </div>
            Bons de Commande
          </h1>
          <p className="text-slate-400 mt-1">
            {orders.length} commande{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-dark-surface border border-dark-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors w-48"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-dark-surface border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="partially_received">Partiellement reçu</option>
            <option value="received">Reçu</option>
            <option value="cancelled">Annulé</option>
          </select>
          <button
            onClick={() => {
              setShowCreateModal(true);
              addLine();
            }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-5 py-3 rounded-xl font-medium transition-colors"
          >
            <Plus size={20} />
            Nouveau
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-12 text-center">
          <ClipboardList size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-500">Aucun bon de commande</p>
        </div>
      ) : (
        <div className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border text-left">
                <th className="px-6 py-4 text-sm font-medium text-slate-400">
                  N° Commande
                </th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">
                  Fournisseur
                </th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">
                  Statut
                </th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400 text-right">
                  Montant
                </th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">
                  Date
                </th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400" />
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => {
                const sc = statusConfig[order.status];
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => openDetail(order.id)}
                    className="border-b border-dark-border/50 hover:bg-dark-bg/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-white font-medium">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-300 flex items-center gap-2">
                      <Truck size={14} className="text-slate-500" />
                      {order.supplierName}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${sc.badgeClass}`}
                      >
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white text-right font-medium">
                      {formatPrice(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatDate(order.orderedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <ChevronRight size={16} className="text-slate-600" />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCreateModal(false);
              setNewLines([]);
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-dark-surface rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 border border-dark-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">
                  Nouveau bon de commande
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewLines([]);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Fournisseur *
                  </label>
                  <select
                    value={newSupplierId}
                    onChange={(e) => setNewSupplierId(Number(e.target.value))}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value={0}>Sélectionner un fournisseur...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Produits *
                  </label>
                  <div className="space-y-2">
                    {newLines.map((line, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <select
                          value={line.productId}
                          onChange={(e) =>
                            updateLine(i, "productId", e.target.value)
                          }
                          className="flex-1 bg-dark-bg border border-dark-border rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-primary-500"
                        >
                          <option value={0}>Sélectionner un produit...</option>
                          {products
                            .filter((p) => p.isActive)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={line.quantityOrdered}
                          onChange={(e) =>
                            updateLine(
                              i,
                              "quantityOrdered",
                              Math.max(1, parseInt(e.target.value) || 1),
                            )
                          }
                          className="w-20 bg-dark-bg border border-dark-border rounded-xl py-2 px-3 text-white text-sm text-center focus:outline-none focus:border-primary-500"
                        />
                        <button
                          onClick={() => removeLine(i)}
                          className="p-2 text-slate-400 hover:text-rose-400"
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addLine}
                    className="mt-2 w-full py-2 border-2 border-dashed border-dark-border rounded-xl text-slate-400 hover:text-primary-400 hover:border-primary-500 transition-colors text-sm"
                  >
                    + Ajouter un produit
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500 resize-none text-sm"
                    placeholder="Notes optionnelles..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewLines([]);
                  }}
                  className="flex-1 py-3 bg-dark-bg border border-dark-border text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={
                    !newSupplierId ||
                    newLines.filter((l) => l.productId > 0).length === 0
                  }
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                >
                  Créer la commande
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowDetail(false);
              setDetail(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-dark-surface rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 border border-dark-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {detail.orderNumber}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {detail.supplierName} — {formatDate(detail.orderedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[detail.status].badgeClass}`}
                  >
                    {statusConfig[detail.status].label}
                  </span>
                  <button
                    onClick={() => {
                      setShowDetail(false);
                      setDetail(null);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="bg-dark-bg rounded-xl border border-dark-border overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="px-4 py-3 text-left text-slate-400">
                        Produit
                      </th>
                      <th className="px-4 py-3 text-center text-slate-400">
                        Commandé
                      </th>
                      <th className="px-4 py-3 text-center text-slate-400">
                        Reçu
                      </th>
                      <th className="px-4 py-3 text-right text-slate-400">
                        P.U.
                      </th>
                      <th className="px-4 py-3 text-right text-slate-400">
                        Sous-total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-dark-border/50"
                      >
                        <td className="px-4 py-3 text-white">
                          {item.productName}
                          <span className="text-slate-500 text-xs ml-2">
                            {item.productSku}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-300">
                          {item.quantityOrdered}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={
                              item.quantityReceived >= item.quantityOrdered
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }
                          >
                            {item.quantityReceived}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {formatPrice(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {formatPrice(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-right text-slate-400 font-medium"
                      >
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-white font-bold">
                        {formatPrice(detail.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {detail.notes && (
                <p className="text-slate-400 text-sm mb-6">
                  Notes: {detail.notes}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {(detail.status === "pending" ||
                  detail.status === "partially_received") && (
                  <button
                    onClick={openReceive}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
                  >
                    <Check size={18} />
                    Réceptionner
                  </button>
                )}
                {detail.status === "pending" && (
                  <button
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 rounded-xl transition-colors"
                  >
                    <XCircle size={18} />
                    Annuler
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receive Modal */}
      <AnimatePresence>
        {showReceiveModal && detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReceiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-dark-surface rounded-2xl w-full max-w-lg p-6 border border-dark-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-6">
                Réceptionner {detail.orderNumber}
              </h3>

              <div className="space-y-3 mb-6">
                {detail.items.map((item, i) => {
                  const remaining =
                    item.quantityOrdered - item.quantityReceived;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-dark-bg rounded-xl p-3"
                    >
                      <div className="flex-1">
                        <p className="text-white text-sm">{item.productName}</p>
                        <p className="text-slate-500 text-xs">
                          Commandé: {item.quantityOrdered} | Déjà reçu:{" "}
                          {item.quantityReceived} | Restant: {remaining}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        value={receiveItems[i]?.quantityReceived ?? 0}
                        onChange={(e) => {
                          const updated = [...receiveItems];
                          updated[i] = {
                            ...updated[i],
                            quantityReceived: Math.min(
                              remaining,
                              Math.max(0, parseInt(e.target.value) || 0),
                            ),
                          };
                          setReceiveItems(updated);
                        }}
                        className="w-20 bg-dark-surface border border-dark-border rounded-lg py-2 px-3 text-white text-center text-sm focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="flex-1 py-3 bg-dark-bg border border-dark-border text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReceive}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
                >
                  Confirmer la réception
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
