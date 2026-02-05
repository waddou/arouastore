import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Shield,
  ShieldCheck,
  User,
  RefreshCw,
  Search,
  ChevronDown,
  Plus,
  Trash2,
  X,
  Mail,
  UserPlus,
} from "lucide-react";
import clsx from "clsx";
import { api, UserRole } from "../api/client";
import { useAuthStore } from "../store/authStore";

interface UserRoleEntry {
  id: number;
  authUserId: string;
  role: UserRole;
  email?: string;
  name?: string;
  createdAt: number;
}

const roleConfig = {
  admin: {
    label: "Administrateur",
    icon: ShieldCheck,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    description: "Accès complet au système",
  },
  manager: {
    label: "Manager",
    icon: Shield,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    description: "Gestion des stocks et rapports",
  },
  agent: {
    label: "Agent",
    icon: User,
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    description: "Ventes et réparations",
  },
};

export const UsersAdmin = () => {
  const [users, setUsers] = useState<UserRoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("agent");
  const [addingUser, setAddingUser] = useState(false);

  // Confirm delete modal
  const [confirmDeleteUser, setConfirmDeleteUser] =
    useState<UserRoleEntry | null>(null);

  const currentUser = useAuthStore((s) => s.user);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllUserRoles();
      setUsers(data || []);
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (authUserId: string, newRole: UserRole) => {
    setSavingUserId(authUserId);
    try {
      await api.setUserRole(authUserId, newRole);
      setUsers((prev) =>
        prev.map((u) =>
          u.authUserId === authUserId ? { ...u, role: newRole } : u,
        ),
      );
      setEditingUserId(null);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la modification du rôle");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) return;

    setAddingUser(true);
    setError(null);
    try {
      // 1. Create user role
      const newUser = await api.createUser(
        newUserEmail.trim(),
        newUserRole,
        newUserName.trim() || undefined,
      );

      // 2. Create credentials for login
      const credResponse = await fetch(
        "http://localhost:3001/api/admin/users/credentials",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-user-id": currentUser?.id || "",
            "x-auth-email": currentUser?.email || "",
          },
          body: JSON.stringify({
            email: newUserEmail.trim(),
            password: newUserPassword.trim(),
            authUserId: newUser.authUserId,
          }),
        },
      );

      if (!credResponse.ok) {
        console.warn("Credentials creation failed, but user role was created");
      }

      setUsers((prev) => [newUser, ...prev]);
      setShowAddModal(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("agent");
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'ajout de l'utilisateur");
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;

    setDeletingUserId(confirmDeleteUser.authUserId);
    setError(null);
    try {
      await api.deleteUser(confirmDeleteUser.authUserId);
      setUsers((prev) =>
        prev.filter((u) => u.authUserId !== confirmDeleteUser.authUserId),
      );
      setConfirmDeleteUser(null);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la suppression");
    } finally {
      setDeletingUserId(null);
    }
  };

  const getUserDisplay = (user: UserRoleEntry) => {
    if (user.name) return user.name;
    if (user.email) return user.email;
    if (user.authUserId.startsWith("pending_")) {
      return (
        user.authUserId.replace("pending_", "").replace(/_/g, ".") +
        " (en attente)"
      );
    }
    return user.authUserId.slice(0, 12) + "...";
  };

  const filteredUsers = users.filter((u) => {
    const search = searchTerm.toLowerCase();
    return (
      u.authUserId.toLowerCase().includes(search) ||
      (u.email && u.email.toLowerCase().includes(search)) ||
      (u.name && u.name.toLowerCase().includes(search))
    );
  });

  const roleOptions: UserRole[] = ["admin", "manager", "agent"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-primary-600/20 rounded-xl">
              <Users className="text-primary-500" size={28} />
            </div>
            Gestion des Utilisateurs
          </h1>
          <p className="text-slate-400 mt-2">
            Ajoutez, modifiez ou supprimez les utilisateurs du système
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-dark-surface border border-dark-border rounded-xl hover:border-primary-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-colors font-medium"
          >
            <Plus size={18} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roleOptions.map((role) => {
          const config = roleConfig[role];
          const count = users.filter((u) => u.role === role).length;
          const Icon = config.icon;
          return (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                "p-4 rounded-xl border backdrop-blur-sm",
                config.color,
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">{config.label}s</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
                <Icon size={32} className="opacity-50" />
              </div>
              <p className="text-xs opacity-60 mt-2">{config.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Rechercher par nom, email ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-dark-surface border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
        />
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="hover:text-white">
            <X size={18} />
          </button>
        </motion.div>
      )}

      {/* Users Table */}
      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>Aucun utilisateur trouvé</p>
            <p className="text-sm mt-2">
              Cliquez sur "Ajouter" pour créer un nouvel utilisateur
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-border/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                    Utilisateur
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                    Rôle
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400 hidden md:table-cell">
                    Date d'ajout
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                <AnimatePresence>
                  {filteredUsers.map((userEntry) => {
                    const config = roleConfig[userEntry.role];
                    const Icon = config.icon;
                    const isEditing = editingUserId === userEntry.authUserId;
                    const isSaving = savingUserId === userEntry.authUserId;
                    const isCurrentUser =
                      currentUser?.id === userEntry.authUserId;
                    const isPending =
                      userEntry.authUserId.startsWith("pending_");

                    return (
                      <motion.tr
                        key={userEntry.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-dark-border/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                config.color.split(" ")[0],
                              )}
                            >
                              {isPending ? (
                                <Mail size={18} />
                              ) : (
                                <Icon size={18} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">
                                {getUserDisplay(userEntry)}
                              </p>
                              {userEntry.email && userEntry.name && (
                                <p className="text-sm text-slate-400 truncate">
                                  {userEntry.email}
                                </p>
                              )}
                              {isCurrentUser && (
                                <span className="text-xs text-primary-400">
                                  (Vous)
                                </span>
                              )}
                              {isPending && (
                                <span className="text-xs text-amber-400">
                                  En attente de première connexion
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="relative inline-block">
                              <select
                                value={userEntry.role}
                                onChange={(e) =>
                                  handleRoleChange(
                                    userEntry.authUserId,
                                    e.target.value as UserRole,
                                  )
                                }
                                disabled={isSaving}
                                className="appearance-none bg-dark-bg border border-dark-border rounded-lg px-4 py-2 pr-10 focus:border-primary-500 outline-none cursor-pointer"
                              >
                                {roleOptions.map((role) => (
                                  <option key={role} value={role}>
                                    {roleConfig[role].label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                                size={16}
                              />
                            </div>
                          ) : (
                            <span
                              className={clsx(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium",
                                config.color,
                              )}
                            >
                              <Icon size={14} />
                              {config.label}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 hidden md:table-cell">
                          {new Date(
                            userEntry.createdAt * 1000,
                          ).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="text-slate-400 hover:text-white transition-colors text-sm px-3 py-1.5"
                              >
                                Annuler
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() =>
                                    setEditingUserId(userEntry.authUserId)
                                  }
                                  disabled={
                                    isCurrentUser && userEntry.role === "admin"
                                  }
                                  className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                    isCurrentUser && userEntry.role === "admin"
                                      ? "text-slate-500 cursor-not-allowed"
                                      : "bg-primary-600/20 text-primary-400 hover:bg-primary-600/30",
                                  )}
                                  title={
                                    isCurrentUser && userEntry.role === "admin"
                                      ? "Vous ne pouvez pas modifier votre propre rôle admin"
                                      : ""
                                  }
                                >
                                  Modifier
                                </button>
                                <button
                                  onClick={() =>
                                    setConfirmDeleteUser(userEntry)
                                  }
                                  disabled={isCurrentUser}
                                  className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    isCurrentUser
                                      ? "text-slate-600 cursor-not-allowed"
                                      : "text-red-400 hover:bg-red-500/20",
                                  )}
                                  title={
                                    isCurrentUser
                                      ? "Vous ne pouvez pas vous supprimer"
                                      : "Supprimer"
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="p-4 bg-dark-surface border border-dark-border rounded-xl">
        <h3 className="font-semibold text-white mb-3">À propos des rôles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {roleOptions.map((role) => {
            const config = roleConfig[role];
            const Icon = config.icon;
            return (
              <div key={role} className="flex gap-3">
                <Icon
                  size={20}
                  className="text-slate-400 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="font-medium text-white">{config.label}</p>
                  <p className="text-slate-400">{config.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-600/20 rounded-xl">
                    <UserPlus className="text-primary-500" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Ajouter un utilisateur
                    </h2>
                    <p className="text-sm text-slate-400">
                      Créer un compte avec un rôle assigné
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="utilisateur@exemple.com"
                    className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nom (optionnel)
                  </label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mot de passe pour la connexion"
                    className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Rôle *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {roleOptions.map((role) => {
                      const config = roleConfig[role];
                      const Icon = config.icon;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setNewUserRole(role)}
                          className={clsx(
                            "p-3 rounded-xl border text-center transition-all",
                            newUserRole === role
                              ? config.color + " border-2"
                              : "bg-dark-bg border-dark-border hover:border-slate-500",
                          )}
                        >
                          <Icon size={20} className="mx-auto mb-1" />
                          <span className="text-xs font-medium">
                            {config.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-border/50 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={
                      addingUser ||
                      !newUserEmail.trim() ||
                      !newUserPassword.trim()
                    }
                    className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {addingUser ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Ajout...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Ajouter
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDeleteUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDeleteUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-xl">
                    <Trash2 className="text-red-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Confirmer la suppression
                    </h2>
                    <p className="text-sm text-slate-400">
                      Cette action est irréversible
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-slate-300">
                  Êtes-vous sûr de vouloir supprimer l'utilisateur{" "}
                  <span className="font-semibold text-white">
                    {getUserDisplay(confirmDeleteUser)}
                  </span>{" "}
                  ?
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteUser(null)}
                    className="flex-1 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-border/50 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={deletingUserId === confirmDeleteUser.authUserId}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {deletingUserId === confirmDeleteUser.authUserId ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Supprimer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
