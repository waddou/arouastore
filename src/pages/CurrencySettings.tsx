import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, ArrowLeft, Check, Globe, DollarSign, Save } from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Currency settings store
interface CurrencySettings {
  code: string;
  symbol: string;
  position: "before" | "after";
  decimals: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

interface SettingsState {
  currency: CurrencySettings;
  setCurrency: (settings: Partial<CurrencySettings>) => void;
  formatPrice: (amount: number) => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      currency: {
        code: "TND",
        symbol: "DT",
        position: "after",
        decimals: 3,
        thousandsSeparator: " ",
        decimalSeparator: ",",
      },
      setCurrency: (settings) =>
        set((state) => ({
          currency: { ...state.currency, ...settings },
        })),
      formatPrice: (amount: number) => {
        const { currency } = get();
        const numAmount = Number(amount) || 0;
        const formatted = numAmount
          .toFixed(currency.decimals)
          .replace(".", currency.decimalSeparator)
          .replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);

        return currency.position === "before"
          ? `${currency.symbol} ${formatted}`
          : `${formatted} ${currency.symbol}`;
      },
    }),
    {
      name: "phonestore-settings",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Force TND as default for existing users
          return {
            ...persistedState,
            currency: {
              code: "TND",
              symbol: "DT",
              position: "after",
              decimals: 3,
              thousandsSeparator: " ",
              decimalSeparator: ",",
            },
          };
        }
        return persistedState;
      },
    },
  ),
);

// Popular currencies
const currencies = [
  {
    code: "XOF",
    symbol: "FCFA",
    name: "Franc CFA (BCEAO)",
    position: "after" as const,
    decimals: 0,
  },
  {
    code: "XAF",
    symbol: "FCFA",
    name: "Franc CFA (BEAC)",
    position: "after" as const,
    decimals: 0,
  },
  {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    position: "after" as const,
    decimals: 2,
  },
  {
    code: "USD",
    symbol: "$",
    name: "Dollar américain",
    position: "before" as const,
    decimals: 2,
  },
  {
    code: "GBP",
    symbol: "£",
    name: "Livre sterling",
    position: "before" as const,
    decimals: 2,
  },
  {
    code: "MAD",
    symbol: "DH",
    name: "Dirham marocain",
    position: "after" as const,
    decimals: 2,
  },
  {
    code: "TND",
    symbol: "DT",
    name: "Dinar tunisien",
    position: "after" as const,
    decimals: 3,
  },
  {
    code: "DZD",
    symbol: "DA",
    name: "Dinar algérien",
    position: "after" as const,
    decimals: 2,
  },
  {
    code: "GNF",
    symbol: "GNF",
    name: "Franc guinéen",
    position: "after" as const,
    decimals: 0,
  },
  {
    code: "NGN",
    symbol: "₦",
    name: "Naira nigérian",
    position: "before" as const,
    decimals: 2,
  },
];

export const CurrencySettings = () => {
  const { currency, setCurrency, formatPrice } = useSettingsStore();

  const [selectedCode, setSelectedCode] = useState(currency.code);
  const [customSymbol, setCustomSymbol] = useState(currency.symbol);
  const [position, setPosition] = useState<"before" | "after">(
    currency.position,
  );
  const [decimals, setDecimals] = useState(currency.decimals);
  const [thousandsSep, setThousandsSep] = useState(currency.thousandsSeparator);
  const [decimalSep, setDecimalSep] = useState(currency.decimalSeparator);
  const [saved, setSaved] = useState(false);

  // Example price for preview
  const previewPrice = 1234567.89;

  // Update form when currency preset changes
  useEffect(() => {
    const preset = currencies.find((c) => c.code === selectedCode);
    if (preset) {
      setCustomSymbol(preset.symbol);
      setPosition(preset.position);
      setDecimals(preset.decimals);
    }
  }, [selectedCode]);

  const handleSave = () => {
    setCurrency({
      code: selectedCode,
      symbol: customSymbol,
      position,
      decimals,
      thousandsSeparator: thousandsSep,
      decimalSeparator: decimalSep,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Format preview
  const formatPreview = (amount: number) => {
    const formatted = amount
      .toFixed(decimals)
      .replace(".", decimalSep)
      .replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

    return position === "before"
      ? `${customSymbol} ${formatted}`
      : `${formatted} ${customSymbol}`;
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin"
          className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 rounded-xl">
              <Coins className="text-amber-500" size={28} />
            </div>
            Gestion de la Devise
          </h1>
          <p className="text-slate-400 mt-2">
            Configurez le format d'affichage des prix dans votre boutique
          </p>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2"
        >
          <Check size={20} />
          Paramètres de devise enregistrés
        </motion.div>
      )}

      {/* Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-6"
      >
        <h3 className="text-sm font-medium text-amber-300 mb-2 flex items-center gap-2">
          <DollarSign size={16} />
          Aperçu du format
        </h3>
        <p className="text-3xl font-bold text-white">
          {formatPreview(previewPrice)}
        </p>
        <p className="text-sm text-slate-400 mt-2">
          Exemple avec le montant: {previewPrice.toLocaleString("fr-FR")}
        </p>
      </motion.div>

      {/* Currency Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Globe size={20} className="text-primary-400" />
          Sélection de la devise
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {currencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => setSelectedCode(curr.code)}
              className={clsx(
                "p-4 rounded-xl border text-left transition-all",
                selectedCode === curr.code
                  ? "bg-primary-600/20 border-primary-500 text-white"
                  : "bg-dark-bg border-dark-border text-slate-400 hover:border-slate-600",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{curr.symbol}</span>
                {selectedCode === curr.code && (
                  <Check size={16} className="text-primary-400" />
                )}
              </div>
              <p className="text-xs mt-1 opacity-70">{curr.name}</p>
              <p className="text-xs font-mono mt-1">{curr.code}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Custom Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-6">
          Personnalisation
        </h2>

        <div className="space-y-5">
          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Symbole de la devise
            </label>
            <input
              type="text"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              placeholder="€, $, FCFA..."
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Position du symbole
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setPosition("before")}
                className={clsx(
                  "flex-1 py-3 rounded-xl border font-medium transition-all",
                  position === "before"
                    ? "bg-primary-600/20 border-primary-500 text-white"
                    : "bg-dark-bg border-dark-border text-slate-400",
                )}
              >
                Avant ({customSymbol} 100)
              </button>
              <button
                onClick={() => setPosition("after")}
                className={clsx(
                  "flex-1 py-3 rounded-xl border font-medium transition-all",
                  position === "after"
                    ? "bg-primary-600/20 border-primary-500 text-white"
                    : "bg-dark-bg border-dark-border text-slate-400",
                )}
              >
                Après (100 {customSymbol})
              </button>
            </div>
          </div>

          {/* Decimals */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Nombre de décimales
            </label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => setDecimals(num)}
                  className={clsx(
                    "w-14 h-14 rounded-xl border font-bold text-lg transition-all",
                    decimals === num
                      ? "bg-primary-600/20 border-primary-500 text-white"
                      : "bg-dark-bg border-dark-border text-slate-400",
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Separators */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Séparateur des milliers
              </label>
              <select
                value={thousandsSep}
                onChange={(e) => setThousandsSep(e.target.value)}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 outline-none"
              >
                <option value=" ">Espace ( )</option>
                <option value=",">Virgule (,)</option>
                <option value=".">Point (.)</option>
                <option value="">Aucun</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Séparateur décimal
              </label>
              <select
                value={decimalSep}
                onChange={(e) => setDecimalSep(e.target.value)}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 outline-none"
              >
                <option value=",">Virgule (,)</option>
                <option value=".">Point (.)</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 py-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all"
      >
        <Save size={20} />
        Enregistrer les paramètres
      </motion.button>

      {/* Current Settings Info */}
      <div className="p-4 bg-dark-bg/50 rounded-xl text-sm text-slate-500">
        <p>
          <strong className="text-slate-400">Devise actuelle:</strong>{" "}
          {currency.code} ({currency.symbol})
        </p>
        <p className="mt-1">
          Les prix seront affichés avec ce format dans toute l'application.
        </p>
      </div>
    </div>
  );
};
