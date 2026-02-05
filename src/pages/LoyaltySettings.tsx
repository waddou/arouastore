import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Save, Check, ToggleLeft, ToggleRight } from "lucide-react";
import { api } from "../api/client";
import { LoyaltySettings as LoyaltySettingsType } from "../types";

export const LoyaltySettings = () => {
  const [settings, setSettings] = useState<LoyaltySettingsType>({
    enabled: false,
    pointsPerUnit: 1,
    pointsToCurrency: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getLoyaltySettings();
      setSettings(data);
    } catch (error) {
      console.error("Error loading loyalty settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateLoyaltySettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving loyalty settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin" className="p-2 hover:bg-dark-surface rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-slate-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-600/20 rounded-xl">
              <Star className="text-yellow-500" size={28} />
            </div>
            Programme de Fidélité
          </h1>
          <p className="text-slate-400 mt-2">
            Configurez les points de fidélité pour vos clients
          </p>
        </div>
      </div>

      {/* Success */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2"
        >
          <Check size={20} />
          Paramètres de fidélité enregistrés
        </motion.div>
      )}

      {/* Enable/Disable Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Activer le programme</h2>
            <p className="text-sm text-slate-400 mt-1">
              Les clients accumuleront des points sur chaque achat
            </p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className="text-3xl"
          >
            {settings.enabled ? (
              <ToggleRight size={40} className="text-emerald-400" />
            ) : (
              <ToggleLeft size={40} className="text-slate-500" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6 space-y-6"
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Star size={20} className="text-yellow-400" />
          Configuration des points
        </h2>

        {/* Points per unit */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Points gagnés par unité monétaire dépensée
          </label>
          <input
            type="number"
            min={1}
            value={settings.pointsPerUnit}
            onChange={(e) =>
              setSettings({ ...settings, pointsPerUnit: Math.max(1, parseInt(e.target.value) || 1) })
            }
            className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all text-white"
          />
          <p className="text-xs text-slate-500 mt-1">
            Ex: 1 point par unité = une vente de 10 000 donne 10 000 points
          </p>
        </div>

        {/* Points to currency */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Nombre de points pour 1 unité monétaire de remise
          </label>
          <input
            type="number"
            min={1}
            value={settings.pointsToCurrency}
            onChange={(e) =>
              setSettings({ ...settings, pointsToCurrency: Math.max(1, parseInt(e.target.value) || 1) })
            }
            className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all text-white"
          />
          <p className="text-xs text-slate-500 mt-1">
            Ex: 100 points = 1 unité monétaire de remise
          </p>
        </div>
      </motion.div>

      {/* Example */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-xl p-6"
      >
        <h3 className="text-sm font-medium text-yellow-300 mb-3">Exemple de calcul</h3>
        <div className="text-sm text-slate-300 space-y-2">
          <p>
            Un client qui dépense <span className="text-white font-medium">10 000</span> gagne{" "}
            <span className="text-yellow-400 font-medium">{10000 * settings.pointsPerUnit} points</span>
          </p>
          <p>
            Avec <span className="text-yellow-400 font-medium">{settings.pointsToCurrency} points</span>,
            le client obtient <span className="text-white font-medium">1</span> de remise
          </p>
          <p>
            Donc <span className="text-yellow-400 font-medium">{10000 * settings.pointsPerUnit} points</span>
            {" "}= <span className="text-emerald-400 font-medium">
              {Math.floor((10000 * settings.pointsPerUnit) / settings.pointsToCurrency)} de remise
            </span>
          </p>
        </div>
      </motion.div>

      {/* Save */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
      >
        {saving ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        ) : (
          <>
            <Save size={20} />
            Enregistrer les paramètres
          </>
        )}
      </motion.button>
    </div>
  );
};
