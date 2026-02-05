import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import {
  Search,
  Trash2,
  CreditCard,
  ShoppingBag,
  Minus,
  Plus,
  Check,
  User,
  Percent,
  DollarSign,
  Banknote,
  Smartphone,
  X,
  UserPlus,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { useSettingsStore } from "./CurrencySettings";
import { Customer, CashSession } from "../types";
import { api } from "../api/client";

type DiscountType = "percent" | "fixed";
type PaymentMethod = "cash" | "card" | "mobile";

export const POS = () => {
  const {
    products,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    checkout,
    fetchProducts,
    fetchCustomers,
    customers,
    isLoading,
  } = useStore();
  const formatPrice = useSettingsStore((s) => s.formatPrice);
  const currencySymbol = useSettingsStore((s) => s.currency.symbol);

  // Cash session check
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  // Discount
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Success
  const [showSuccess, setShowSuccess] = useState(false);
  const [changeAmount, setChangeAmount] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    checkCashSession();
  }, [fetchProducts, fetchCustomers]);

  const checkCashSession = async () => {
    setCheckingSession(true);
    try {
      const session = await api.getCurrentCashSession();
      setCashSession(session);
    } catch (error) {
      console.error("Error checking cash session:", error);
      setCashSession(null);
    } finally {
      setCheckingSession(false);
    }
  };

  const isCashSessionOpen = cashSession && !cashSession.closedAt;

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory && p.isActive && p.stock > 0;
  });

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch),
  );

  // Calculate totals
  const subtotal = cart.reduce(
    (acc, item) => acc + item.priceSale * item.quantity,
    0,
  );

  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === "percent") {
      return Math.min((subtotal * discountValue) / 100, subtotal);
    }
    return Math.min(discountValue, subtotal);
  }, [subtotal, discountType, discountValue]);

  const total = subtotal - discountAmount;

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    setCustomerSearch("");
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;
    const customer = await api.createCustomer({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
    });
    if (customer) {
      setSelectedCustomer(customer);
      await fetchCustomers();
    }
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setShowCustomerModal(false);
  };

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setAmountReceived(paymentMethod === "cash" ? String(total) : "");
    setShowPaymentModal(true);
  };

  const calculatedChange = useMemo(() => {
    const received = parseFloat(amountReceived) || 0;
    if (paymentMethod !== "cash" || received <= 0) return null;
    return received - total;
  }, [amountReceived, total, paymentMethod]);

  const handleCheckout = async () => {
    const sale = await checkout(
      selectedCustomer?.id,
      discountAmount,
      paymentMethod,
    );
    if (sale) {
      setChangeAmount(calculatedChange);
      setShowPaymentModal(false);
      setShowSuccess(true);
      // Reset state
      setSelectedCustomer(null);
      setDiscountValue(0);
      setAmountReceived("");
      setTimeout(() => {
        setShowSuccess(false);
        setChangeAmount(null);
      }, 4000);
    }
  };

  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Show cash session required overlay
  if (!isCashSessionOpen) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-8 max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Caisse fermée</h2>
          <p className="text-slate-400 mb-6">
            Vous devez ouvrir une session de caisse avant de pouvoir effectuer
            des ventes. Cela permet de suivre les mouvements d'argent et de
            garantir une comptabilité précise.
          </p>
          <Link
            to="/cash-register"
            className="inline-flex items-center justify-center gap-2 w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 px-6 rounded-xl transition-all"
          >
            <Wallet size={20} />
            Ouvrir la caisse
          </Link>
          <button
            onClick={checkCashSession}
            className="w-full mt-3 py-3 text-slate-400 hover:text-white transition-colors text-sm"
          >
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Success notification */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-pulse">
          <div className="flex items-center gap-3">
            <Check size={24} />
            <div>
              <p className="font-bold">Vente enregistrée !</p>
              {changeAmount !== null && changeAmount > 0 && (
                <p className="text-emerald-100 text-sm mt-1">
                  Monnaie à rendre :{" "}
                  <span className="font-bold text-white">
                    {formatPrice(changeAmount)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowCustomerModal(false)}
        >
          <div
            className="bg-dark-surface rounded-2xl w-full max-w-lg p-6 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Sélectionner un client
              </h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {!showNewCustomerForm ? (
              <>
                <div className="relative mb-4">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Rechercher par nom ou téléphone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500"
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">
                      Aucun client trouvé
                    </p>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full flex items-center gap-4 p-3 bg-dark-bg rounded-xl hover:bg-dark-border transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center">
                          <User size={20} className="text-primary-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {customer.name}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {customer.phone}
                          </p>
                        </div>
                        <p className="text-slate-500 text-sm">
                          {formatPrice(customer.totalSpent)} dépensé
                        </p>
                      </button>
                    ))
                  )}
                </div>

                <button
                  onClick={() => setShowNewCustomerForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-dark-border rounded-xl text-slate-400 hover:text-primary-400 hover:border-primary-500 transition-colors"
                >
                  <UserPlus size={20} />
                  Nouveau client
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nom du client"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                  autoFocus
                />
                <input
                  type="tel"
                  placeholder="Numéro de téléphone"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewCustomerForm(false)}
                    className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl text-slate-400 hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateCustomer}
                    disabled={
                      !newCustomerName.trim() || !newCustomerPhone.trim()
                    }
                    className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
                  >
                    Créer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="bg-dark-surface rounded-2xl w-full max-w-md p-6 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Paiement</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Total display */}
            <div className="bg-dark-bg rounded-xl p-4 mb-6 text-center">
              <p className="text-slate-400 text-sm">Total à payer</p>
              <p className="text-3xl font-bold text-white">
                {formatPrice(total)}
              </p>
            </div>

            {/* Payment method */}
            <div className="mb-6">
              <p className="text-slate-400 text-sm mb-3">Mode de paiement</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setPaymentMethod("cash");
                    setAmountReceived(String(total));
                  }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentMethod === "cash" ? "border-primary-500 bg-primary-500/10 text-primary-400" : "border-dark-border text-slate-400 hover:border-slate-500"}`}
                >
                  <Banknote size={24} />
                  <span className="text-sm">Espèces</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentMethod === "card" ? "border-primary-500 bg-primary-500/10 text-primary-400" : "border-dark-border text-slate-400 hover:border-slate-500"}`}
                >
                  <CreditCard size={24} />
                  <span className="text-sm">Carte</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("mobile")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentMethod === "mobile" ? "border-primary-500 bg-primary-500/10 text-primary-400" : "border-dark-border text-slate-400 hover:border-slate-500"}`}
                >
                  <Smartphone size={24} />
                  <span className="text-sm">Mobile</span>
                </button>
              </div>
            </div>

            {/* Cash amount input */}
            {paymentMethod === "cash" && (
              <div className="mb-6">
                <p className="text-slate-400 text-sm mb-3">Montant reçu</p>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl py-4 px-4 text-white text-2xl text-center focus:outline-none focus:border-primary-500"
                  autoFocus
                />

                {/* Quick amounts */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAmountReceived(String(amount))}
                      className="py-2 px-3 bg-dark-bg border border-dark-border rounded-lg text-slate-300 hover:border-primary-500 hover:text-white transition-colors text-sm"
                    >
                      {formatPrice(amount)}
                    </button>
                  ))}
                </div>

                {/* Change display */}
                {calculatedChange !== null && (
                  <div
                    className={`mt-4 p-4 rounded-xl ${calculatedChange >= 0 ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-rose-500/10 border border-rose-500/30"}`}
                  >
                    <p className="text-sm text-slate-400 mb-1">
                      {calculatedChange >= 0
                        ? "Monnaie à rendre"
                        : "Montant insuffisant"}
                    </p>
                    <p
                      className={`text-2xl font-bold ${calculatedChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {formatPrice(Math.abs(calculatedChange))}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Confirm button */}
            <button
              onClick={handleCheckout}
              disabled={
                isLoading ||
                (paymentMethod === "cash" &&
                  (calculatedChange === null || calculatedChange < 0))
              }
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Check size={20} />
                  Valider le paiement
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-surface border border-dark-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-dark-surface border border-dark-border rounded-xl px-4 text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">Toutes catégories</option>
            <option value="phone">Téléphones</option>
            <option value="accessory">Accessoires</option>
            <option value="component">Composants</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500">
                Aucun produit trouvé
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-dark-surface rounded-xl p-4 border border-dark-border cursor-pointer hover:border-primary-500 transition-all hover:shadow-lg hover:shadow-primary-500/10 group"
                >
                  <div className="aspect-square rounded-lg bg-dark-bg mb-4 overflow-hidden relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <ShoppingBag size={48} />
                      </div>
                    )}
                    {product.stock <= product.alertThreshold && (
                      <span className="absolute top-2 right-2 bg-rose-500 text-white text-xs px-2 py-1 rounded-full">
                        Stock: {product.stock}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-medium truncate">
                    {product.name}
                  </h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-primary-400 font-bold">
                      {formatPrice(product.priceSale)}
                    </p>
                    <span className="text-slate-500 text-sm">
                      {product.stock} en stock
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-dark-surface rounded-2xl border border-dark-border flex flex-col overflow-hidden h-full">
        {/* Header with customer selection */}
        <div className="p-4 border-b border-dark-border">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-white">Panier</h2>
            <span className="text-slate-400 text-sm">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} articles
            </span>
          </div>

          {/* Customer selector */}
          <button
            onClick={() => setShowCustomerModal(true)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedCustomer ? "bg-primary-500/10 border-primary-500/30" : "bg-dark-bg border-dark-border hover:border-slate-500"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedCustomer ? "bg-primary-500" : "bg-dark-surface"}`}
            >
              <User
                size={16}
                className={selectedCustomer ? "text-white" : "text-slate-400"}
              />
            </div>
            <div className="flex-1 text-left">
              {selectedCustomer ? (
                <>
                  <p className="text-white font-medium text-sm">
                    {selectedCustomer.name}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {selectedCustomer.phone}
                  </p>
                </>
              ) : (
                <p className="text-slate-400 text-sm">
                  Sélectionner un client (optionnel)
                </p>
              )}
            </div>
            {selectedCustomer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCustomer(null);
                }}
                className="text-slate-500 hover:text-rose-400"
              >
                <X size={16} />
              </button>
            )}
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p>Le panier est vide</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-dark-bg p-3 rounded-xl"
              >
                <div className="w-10 h-10 rounded-lg bg-dark-surface flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag size={20} className="text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate text-sm">
                    {item.name}
                  </h4>
                  <p className="text-primary-400 font-medium text-sm">
                    {formatPrice(item.priceSale * item.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCartQuantity(item.id, item.quantity - 1);
                    }}
                    className="p-1 bg-dark-surface rounded text-slate-400 hover:text-white transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-white w-6 text-center text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCartQuantity(
                        item.id,
                        Math.min(item.quantity + 1, item.stock),
                      );
                    }}
                    className="p-1 bg-dark-surface rounded text-slate-400 hover:text-white transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(item.id);
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Discount & Total section */}
        <div className="p-4 bg-dark-bg border-t border-dark-border space-y-3">
          {/* Discount toggle */}
          <div>
            <button
              onClick={() => setShowDiscountPanel(!showDiscountPanel)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${discountValue > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-dark-surface border-dark-border hover:border-slate-500"}`}
            >
              <div className="flex items-center gap-2">
                <Percent
                  size={18}
                  className={
                    discountValue > 0 ? "text-amber-400" : "text-slate-400"
                  }
                />
                <span
                  className={
                    discountValue > 0 ? "text-amber-400" : "text-slate-400"
                  }
                >
                  {discountValue > 0
                    ? `Remise: ${discountType === "percent" ? `${discountValue}%` : formatPrice(discountValue)}`
                    : "Ajouter une remise"}
                </span>
              </div>
              {discountValue > 0 && (
                <span className="text-amber-400 font-medium">
                  -{formatPrice(discountAmount)}
                </span>
              )}
            </button>

            {showDiscountPanel && (
              <div className="mt-3 p-3 bg-dark-surface rounded-xl border border-dark-border space-y-3">
                {/* Discount type selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDiscountType("percent");
                      setDiscountValue(0);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${discountType === "percent" ? "border-primary-500 bg-primary-500/10 text-primary-400" : "border-dark-border text-slate-400"}`}
                  >
                    <Percent size={16} />
                    Pourcentage
                  </button>
                  <button
                    onClick={() => {
                      setDiscountType("fixed");
                      setDiscountValue(0);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${discountType === "fixed" ? "border-primary-500 bg-primary-500/10 text-primary-400" : "border-dark-border text-slate-400"}`}
                  >
                    <DollarSign size={16} />
                    Montant fixe
                  </button>
                </div>

                {/* Discount input */}
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={discountType === "percent" ? 100 : subtotal}
                    value={discountValue || ""}
                    onChange={(e) =>
                      setDiscountValue(
                        Math.max(0, parseFloat(e.target.value) || 0),
                      )
                    }
                    placeholder="0"
                    className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-4 pr-12 text-white focus:outline-none focus:border-primary-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {discountType === "percent" ? "%" : currencySymbol}
                  </span>
                </div>

                {/* Quick discount buttons */}
                {discountType === "percent" && (
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map((val) => (
                      <button
                        key={val}
                        onClick={() => setDiscountValue(val)}
                        className={`flex-1 py-1.5 rounded-lg text-sm transition-all ${discountValue === val ? "bg-primary-500 text-white" : "bg-dark-bg text-slate-400 hover:text-white"}`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Sous-total</span>
              <span className="text-slate-300">{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-400">Remise</span>
                <span className="text-amber-400">
                  -{formatPrice(discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-dark-border">
              <span className="text-slate-300 font-medium">Total</span>
              <span className="text-2xl font-bold text-white">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* Checkout button */}
          <button
            onClick={handleOpenPayment}
            disabled={cart.length === 0 || isLoading}
            className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <CreditCard size={20} />
                Encaisser
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
