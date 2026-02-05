import React, { useEffect, useRef } from "react";
import { X, CheckCheck, Package, Wrench, Wallet, Bell } from "lucide-react";
import { useNotificationStore } from "../../store/notificationStore";
import { NotificationType } from "../../types";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons: Record<NotificationType, React.ElementType> = {
  stock_low: Package,
  repair_status: Wrench,
  cash_session: Wallet,
  general: Bell,
};

const typeColors: Record<NotificationType, string> = {
  stock_low: "text-amber-400 bg-amber-500/20",
  repair_status: "text-blue-400 bg-blue-500/20",
  cash_session: "text-emerald-400 bg-emerald-500/20",
  general: "text-slate-400 bg-slate-500/20",
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "À l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    isLoading,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close on outside click — check parent container to avoid conflict with bell toggle
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const parent = panelRef.current?.parentElement;
      if (parent && !parent.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 bg-dark-surface border border-dark-border rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-border">
        <h3 className="text-white font-semibold">Notifications</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="text-xs text-slate-400 hover:text-primary-400 transition-colors flex items-center gap-1"
            title="Tout marquer comme lu"
          >
            <CheckCheck size={14} />
            Tout lu
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-500 text-sm">Aucune notification</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const colorClass =
              typeColors[notification.type] || typeColors.general;
            return (
              <div
                key={notification.id}
                onClick={() => {
                  if (!notification.isRead) markRead(notification.id);
                }}
                className={`flex items-start gap-3 p-4 border-b border-dark-border cursor-pointer transition-colors ${
                  notification.isRead
                    ? "bg-transparent hover:bg-dark-bg/50"
                    : "bg-primary-600/5 hover:bg-primary-600/10"
                }`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${notification.isRead ? "text-slate-300" : "text-white"}`}
                    >
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
