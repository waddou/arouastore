import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Package,
  User,
  Coins,
  ChevronRight,
  Settings,
  Store,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "../store/authStore";
import { useSettingsStore } from "./CurrencySettings";

interface ConfigCard {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  color: string;
  bgColor: string;
  adminOnly?: boolean;
}

const allConfigCards: ConfigCard[] = [
  {
    icon: ShoppingBag,
    title: "Gestion des produits",
    description:
      "Ajouter, modifier et supprimer des telephones, accessoires et composants",
    path: "/admin/products",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/30",
    adminOnly: true,
  },
  {
    icon: Smartphone,
    title: "Marques & Modeles",
    description:
      "Gerer les marques et modeles d'appareils pour les reparations",
    path: "/admin/device-brands",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/30",
    adminOnly: true,
  },
  {
    icon: Users,
    title: "Gérer les utilisateurs",
    description: "Attribuer des rôles et permissions aux membres de l'équipe",
    path: "/admin/users",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30",
    adminOnly: true,
  },
  {
    icon: Package,
    title: "Gérer le stock",
    description: "Configurer les seuils d'alerte et catégories de produits",
    path: "/inventory",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30",
    adminOnly: true,
  },
  {
    icon: User,
    title: "Mon profil",
    description: "Modifier vos informations personnelles et mot de passe",
    path: "/admin/profile",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30",
    adminOnly: false,
  },
  {
    icon: Coins,
    title: "Devise",
    description: "Configurer la devise et les formats monétaires",
    path: "/admin/currency",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30",
    adminOnly: true,
  },
  {
    icon: Store,
    title: "Paramètres magasin",
    description: "Nom, adresse, horaires et logo de votre boutique",
    path: "/admin/store",
    color: "text-rose-400",
    bgColor: "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/30",
    adminOnly: true,
  },
];

export const AdminConfig = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const currency = useSettingsStore((s) => s.currency);

  // Filter cards based on role
  const configCards = allConfigCards.filter(
    (card) => !card.adminOnly || isAdmin,
  );
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-primary-600/20 rounded-xl">
            <Settings className="text-primary-500" size={28} />
          </div>
          Configuration Admin
        </h1>
        <p className="text-slate-400 mt-2">
          Gérez les paramètres et configurations de votre boutique
        </p>
      </div>

      {/* Config Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={card.path}>
                <div
                  className={clsx(
                    "p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300 group cursor-pointer",
                    card.bgColor,
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={clsx(
                          "p-3 rounded-xl bg-dark-bg/50",
                          card.color,
                        )}
                      >
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {card.title}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {card.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Informations système
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-dark-bg/50 rounded-xl">
            <p className="text-2xl font-bold text-primary-400">v1.0</p>
            <p className="text-sm text-slate-400 mt-1">Version</p>
          </div>
          <div className="text-center p-4 bg-dark-bg/50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-400">
              {currency.code}
            </p>
            <p className="text-sm text-slate-400 mt-1">Devise</p>
          </div>
          <div className="text-center p-4 bg-dark-bg/50 rounded-xl">
            <p className="text-2xl font-bold text-blue-400">FR</p>
            <p className="text-sm text-slate-400 mt-1">Langue</p>
          </div>
          <div className="text-center p-4 bg-dark-bg/50 rounded-xl">
            <p className="text-2xl font-bold text-amber-400">UTC+0</p>
            <p className="text-sm text-slate-400 mt-1">Fuseau</p>
          </div>
        </div>
      </div>
    </div>
  );
};
