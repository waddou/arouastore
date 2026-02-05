import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ArrowLeft,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Check,
  X,
  Calculator,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { api } from "../api/client";
import { useSettingsStore } from "./CurrencySettings";
import { useAuthStore } from "../store/authStore";
import { useStoreSettingsStore } from "./StoreSettings";

interface CashSession {
  id: number;
  userId: number;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  discrepancy: number | null;
  openedAt: number;
  closedAt: number | null;
  notes: string | null;
}

export const CashRegister = () => {
  const [currentSession, setCurrentSession] = useState<CashSession | null>(
    null,
  );
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [closingAmount, setClosingAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formatPrice = useSettingsStore((s) => s.formatPrice);
  const user = useAuthStore((s) => s.user);
  const storeSettings = useStoreSettingsStore((s) => s.store);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [current, history] = await Promise.all([
        api.getCurrentCashSession(),
        api.getCashSessions ? api.getCashSessions(30) : [],
      ]);
      setCurrentSession(current);
      setSessions(history || []);
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fermeture automatique de la caisse à l'heure de fermeture
  const handleAutoClose = async () => {
    if (!currentSession) return;

    try {
      // Fermeture automatique avec le montant d'ouverture (sera ajusté par l'admin plus tard si nécessaire)
      await api.closeCashSession(
        currentSession.id,
        0, // Montant à 0 car fermeture automatique
        "Fermeture automatique à l'heure de fermeture du magasin",
      );
      setCurrentSession(null);
      setSuccessMessage("Caisse fermée automatiquement (heure de fermeture)");
      setTimeout(() => setSuccessMessage(null), 5000);
      loadData();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la fermeture automatique");
    }
  };

  useEffect(() => {
    if (
      !storeSettings.autoCashClose ||
      !storeSettings.closingTime ||
      !currentSession
    ) {
      return;
    }

    const checkClosingTime = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      if (currentTime === storeSettings.closingTime) {
        handleAutoClose();
      }
    };

    // Vérifier immédiatement au cas où l'heure est déjà passée
    checkClosingTime();

    // Vérifier toutes les minutes
    const interval = setInterval(checkClosingTime, 60000);

    return () => clearInterval(interval);
  }, [currentSession, storeSettings.autoCashClose, storeSettings.closingTime]);

  const handleOpenSession = async () => {
    if (openingAmount < 0) {
      setError("Le montant doit être positif");
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const session = await api.openCashSession(
        openingAmount,
        notes || undefined,
      );
      setCurrentSession(session);
      setShowOpenModal(false);
      setOpeningAmount(0);
      setNotes("");
      setSuccessMessage("Caisse ouverte avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'ouverture");
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;
    if (closingAmount < 0) {
      setError("Le montant doit être positif");
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      await api.closeCashSession(
        currentSession.id,
        closingAmount,
        notes || undefined,
      );
      setCurrentSession(null);
      setShowCloseModal(false);
      setClosingAmount(0);
      setNotes("");
      setSuccessMessage("Caisse fermée avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la fermeture");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 rounded-xl">
                <Wallet className="text-emerald-500" size={28} />
              </div>
              Gestion de Caisse
            </h1>
            <p className="text-slate-400 mt-1">
              Ouvrez, fermez et suivez les sessions de caisse
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-dark-surface border border-dark-border rounded-xl hover:border-primary-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2"
        >
          <Check size={20} />
          {successMessage}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* Current Session Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(
          "p-6 rounded-2xl border",
          currentSession
            ? "bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border-emerald-500/30"
            : "bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/30",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {currentSession ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400 font-medium">
                    Caisse ouverte
                  </span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-amber-400 font-medium">
                    Caisse fermée
                  </span>
                </>
              )}
            </div>
            {currentSession && (
              <div className="space-y-1 text-sm text-slate-400">
                <p className="flex items-center gap-2">
                  <Clock size={14} />
                  Ouverte le {formatDate(currentSession.openedAt)}
                </p>
                <p className="flex items-center gap-2">
                  <DollarSign size={14} />
                  Fond de caisse: {formatPrice(currentSession.openingAmount)}
                </p>
                {storeSettings.autoCashClose && storeSettings.closingTime && (
                  <p className="flex items-center gap-2 text-amber-400">
                    <AlertCircle size={14} />
                    Fermeture auto à {storeSettings.closingTime}
                  </p>
                )}
              </div>
            )}
          </div>

          {currentSession ? (
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl flex items-center gap-2 transition-colors"
            >
              <X size={20} />
              Fermer la caisse
            </button>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl flex items-center gap-2 transition-colors"
            >
              <DollarSign size={20} />
              Ouvrir la caisse
            </button>
          )}
        </div>
      </motion.div>

      {/* Session History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText size={20} className="text-primary-400" />
            Historique des sessions
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Wallet size={48} className="mx-auto mb-4 opacity-50" />
            <p>Aucune session de caisse enregistrée</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-dark-bg/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                  Ouverture
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                  Fermeture
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                  Attendu
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">
                  Écart
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-400">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {sessions.map((session) => {
                const discrepancy = session.discrepancy || 0;
                const hasDiscrepancy = Math.abs(discrepancy) > 0;

                return (
                  <tr
                    key={session.id}
                    className="hover:bg-dark-bg/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">
                          {formatDateShort(session.openedAt)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(session.openedAt * 1000).toLocaleTimeString(
                            "fr-FR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {formatPrice(session.openingAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {session.closingAmount !== null
                        ? formatPrice(session.closingAmount)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {session.expectedAmount !== null
                        ? formatPrice(session.expectedAmount)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {session.closedAt ? (
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium",
                            !hasDiscrepancy
                              ? "bg-emerald-500/20 text-emerald-400"
                              : discrepancy > 0
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-red-500/20 text-red-400",
                          )}
                        >
                          {discrepancy > 0 ? (
                            <TrendingUp size={14} />
                          ) : discrepancy < 0 ? (
                            <TrendingDown size={14} />
                          ) : (
                            <Check size={14} />
                          )}
                          {discrepancy > 0 ? "+" : ""}
                          {formatPrice(discrepancy)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {session.closedAt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-500/20 text-slate-400">
                          Fermée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Open Modal */}
      <AnimatePresence>
        {showOpenModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowOpenModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="text-emerald-500" size={24} />
                Ouvrir la caisse
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Fond de caisse initial
                  </label>
                  <div className="relative">
                    <Calculator
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      size={18}
                    />
                    <input
                      type="number"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(Number(e.target.value))}
                      min="0"
                      className="w-full pl-12 pr-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none"
                    placeholder="Notes de l'ouverture..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleOpenSession}
                  disabled={processing}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <Check size={18} />
                      Ouvrir
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close Modal */}
      <AnimatePresence>
        {showCloseModal && currentSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCloseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <X className="text-red-500" size={24} />
                Fermer la caisse
              </h3>

              <div className="p-4 bg-dark-bg rounded-xl mb-4">
                <p className="text-sm text-slate-400 mb-2">
                  Récapitulatif de la session
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ouverture:</span>
                    <span className="text-white">
                      {formatPrice(currentSession.openingAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Durée:</span>
                    <span className="text-white">
                      {Math.round(
                        (Date.now() / 1000 - currentSession.openedAt) / 3600,
                      )}
                      h
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Montant en caisse (compté)
                  </label>
                  <div className="relative">
                    <Calculator
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      size={18}
                    />
                    <input
                      type="number"
                      value={closingAmount}
                      onChange={(e) => setClosingAmount(Number(e.target.value))}
                      min="0"
                      className="w-full pl-12 pr-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Notes de clôture (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all resize-none"
                    placeholder="Notes de fermeture..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCloseSession}
                  disabled={processing}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <Check size={18} />
                      Fermer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
