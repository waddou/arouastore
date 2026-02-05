import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Store,
  ArrowLeft,
  Save,
  MapPin,
  Phone,
  Mail,
  Clock,
  Image,
  Upload,
  X,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Store settings interface
interface StoreSettingsData {
  name: string;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  openingTime: string;
  closingTime: string;
  autoCashClose: boolean;
  logo: string | null;
}

interface StoreSettingsState {
  store: StoreSettingsData;
  setStore: (settings: Partial<StoreSettingsData>) => void;
}

export const useStoreSettingsStore = create<StoreSettingsState>()(
  persist(
    (set) => ({
      store: {
        name: "PhoneStore",
        address: "",
        phone: "",
        email: "",
        openingHours: "09:00 - 18:00",
        openingTime: "09:00",
        closingTime: "18:00",
        autoCashClose: true,
        logo: null,
      },
      setStore: (settings) =>
        set((state) => ({
          store: { ...state.store, ...settings },
        })),
    }),
    { name: "phonestore-store-settings" },
  ),
);

export const StoreSettings = () => {
  const { store, setStore } = useStoreSettingsStore();

  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address);
  const [phone, setPhone] = useState(store.phone);
  const [email, setEmail] = useState(store.email);
  const [openingHours, setOpeningHours] = useState(store.openingHours);
  const [openingTime, setOpeningTime] = useState(store.openingTime || "09:00");
  const [closingTime, setClosingTime] = useState(store.closingTime || "18:00");
  const [autoCashClose, setAutoCashClose] = useState(
    store.autoCashClose ?? true,
  );
  const [logo, setLogo] = useState<string | null>(store.logo);
  const [saved, setSaved] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setStore({
      name,
      address,
      phone,
      email,
      openingHours: `${openingTime} - ${closingTime}`,
      openingTime,
      closingTime,
      autoCashClose,
      logo,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
            <div className="p-2 bg-rose-600/20 rounded-xl">
              <Store className="text-rose-500" size={28} />
            </div>
            Paramètres du Magasin
          </h1>
          <p className="text-slate-400 mt-2">
            Configurez les informations de votre boutique
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
          Paramètres du magasin enregistrés
        </motion.div>
      )}

      {/* Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Image size={20} className="text-primary-400" />
          Logo du magasin
        </h2>

        <div className="flex items-center gap-6">
          <div className="relative">
            {logo ? (
              <div className="relative">
                <img
                  src={logo}
                  alt="Logo"
                  className="w-24 h-24 rounded-xl object-cover border-2 border-dark-border"
                />
                <button
                  onClick={() => setLogo(null)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-xl bg-dark-bg border-2 border-dashed border-dark-border flex items-center justify-center">
                <Store size={32} className="text-slate-600" />
              </div>
            )}
          </div>
          <div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg hover:bg-primary-600/30 transition-colors">
                <Upload size={18} />
                Télécharger un logo
              </div>
            </label>
            <p className="text-xs text-slate-500 mt-2">
              PNG, JPG jusqu'à 2MB. Recommandé: 200x200px
            </p>
          </div>
        </div>
      </motion.div>

      {/* Store Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Store size={20} className="text-rose-400" />
          Informations générales
        </h2>

        <div className="space-y-5">
          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Nom du magasin
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              placeholder="PhoneStore"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <MapPin size={14} />
              Adresse
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all resize-none"
              placeholder="123 Rue du Commerce, Dakar"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <Phone size={14} />
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              placeholder="+221 77 123 45 67"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <Mail size={14} />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              placeholder="contact@phonestore.sn"
            />
          </div>

          {/* Opening Hours */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <Clock size={14} />
              Horaires d'ouverture
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Ouverture
                </label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Fermeture
                </label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Auto Cash Close */}
          <div className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-dark-border">
            <div>
              <p className="text-white font-medium">
                Fermeture automatique de la caisse
              </p>
              <p className="text-sm text-slate-400">
                La caisse sera fermée automatiquement à l'heure de fermeture
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoCashClose(!autoCashClose)}
              className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                autoCashClose ? "bg-primary-600" : "bg-slate-600",
              )}
            >
              <span
                className={clsx(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  autoCashClose ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 py-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all"
      >
        <Save size={20} />
        Enregistrer les paramètres
      </motion.button>

      {/* Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-rose-600/20 to-pink-600/20 border border-rose-500/30 rounded-xl p-6"
      >
        <h3 className="text-sm font-medium text-rose-300 mb-4">Aperçu</h3>
        <div className="flex items-center gap-4">
          {logo ? (
            <img
              src={logo}
              alt="Logo"
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-dark-bg/50 flex items-center justify-center">
              <Store size={24} className="text-slate-500" />
            </div>
          )}
          <div>
            <h4 className="text-xl font-bold text-white">
              {name || "PhoneStore"}
            </h4>
            {address && <p className="text-sm text-slate-400">{address}</p>}
            {phone && <p className="text-sm text-slate-400">{phone}</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
