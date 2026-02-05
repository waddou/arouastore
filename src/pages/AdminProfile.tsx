import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Upload,
  Camera,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { useAuthStore } from "../store/authStore";

export const AdminProfile = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(
    localStorage.getItem("phonestore-avatar"),
  );

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatar(result);
        localStorage.setItem("phonestore-avatar", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatar(null);
    localStorage.removeItem("phonestore-avatar");
  };

  const roleLabels = {
    admin: "Administrateur",
    manager: "Manager",
    agent: "Agent",
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("http://localhost:3001/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-auth-user-id": user?.id || "",
          "x-auth-email": user?.email || "",
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      if (user) {
        setUser({ ...user, name });
      }
      setSuccessMessage("Profil mis à jour avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Erreur lors de la mise à jour du profil",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setSavingPassword(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        "http://localhost:3001/api/auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-user-id": user?.id || "",
            "x-auth-email": user?.email || "",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || "Erreur lors du changement de mot de passe",
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Mot de passe modifié avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Erreur lors du changement de mot de passe",
      );
    } finally {
      setSavingPassword(false);
    }
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
            <div className="p-2 bg-emerald-600/20 rounded-xl">
              <User className="text-emerald-500" size={28} />
            </div>
            Mon Profil
          </h1>
          <p className="text-slate-400 mt-2">
            Gérez vos informations personnelles et votre mot de passe
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2"
        >
          <CheckCircle size={20} />
          {successMessage}
        </motion.div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400"
        >
          {errorMessage}
        </motion.div>
      )}

      {/* Profile Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Camera size={20} className="text-primary-400" />
          Photo de profil
        </h2>

        <div className="flex items-center gap-6">
          <div className="relative">
            {avatar ? (
              <div className="relative">
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary-500/30"
                />
                <button
                  onClick={removeAvatar}
                  className="absolute -top-1 -right-1 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-dark-bg border-4 border-dark-border flex items-center justify-center">
                <User size={40} className="text-slate-600" />
              </div>
            )}
          </div>
          <div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg hover:bg-primary-600/30 transition-colors">
                <Upload size={18} />
                {avatar ? "Changer la photo" : "Ajouter une photo"}
              </div>
            </label>
            <p className="text-xs text-slate-500 mt-2">
              JPG, PNG. Taille recommandée: 200x200px
            </p>
          </div>
        </div>
      </motion.div>

      {/* Account Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <User size={20} className="text-primary-400" />
          Informations du compte
        </h2>

        <form onSubmit={handleUpdateProfile} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Nom complet
            </label>
            <div className="relative">
              <User
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                placeholder="Votre nom"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="email"
                value={email}
                disabled
                className="w-full pl-12 pr-4 py-3 bg-dark-bg/50 border border-dark-border rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              L'email ne peut pas être modifié
            </p>
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Rôle
            </label>
            <div className="relative">
              <Shield
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                value={user?.role ? roleLabels[user.role] : "Non défini"}
                disabled
                className="w-full pl-12 pr-4 py-3 bg-dark-bg/50 border border-dark-border rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || name === user?.name}
            className={clsx(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
              saving || name === user?.name
                ? "bg-dark-border text-slate-500 cursor-not-allowed"
                : "bg-primary-600 hover:bg-primary-700 text-white",
            )}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Save size={18} />
                Enregistrer les modifications
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Change Password Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Shield size={20} className="text-amber-400" />
          Changer le mot de passe
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              savingPassword ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
            className={clsx(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
              savingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
                ? "bg-dark-border text-slate-500 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700 text-white",
            )}
          >
            {savingPassword ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Shield size={18} />
                Changer le mot de passe
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Account Info */}
      <div className="text-center text-sm text-slate-500">
        <Calendar size={14} className="inline mr-1" />
        Membre depuis{" "}
        {new Date().toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        })}
      </div>
    </div>
  );
};
