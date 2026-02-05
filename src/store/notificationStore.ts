import { create } from "zustand";
import { Notification } from "../types";
import { api } from "../api/client";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  pollingId: ReturnType<typeof setInterval> | null;

  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  pollingId: null,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const result = await api.getNotifications({ limit: 50 });
      set({
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await api.getUnreadNotificationCount();
      set({ unreadCount: count });
    } catch {
      // silent fail for polling
    }
  },

  markRead: async (id: number) => {
    try {
      await api.markNotificationRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // silent fail
    }
  },

  markAllRead: async () => {
    try {
      await api.markAllNotificationsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      // silent fail
    }
  },

  startPolling: () => {
    const { pollingId } = get();
    if (pollingId) return; // already polling

    // Fetch immediately
    get().fetchUnreadCount();

    const id = setInterval(() => {
      get().fetchUnreadCount();
    }, 30000);

    set({ pollingId: id });
  },

  stopPolling: () => {
    const { pollingId } = get();
    if (pollingId) {
      clearInterval(pollingId);
      set({ pollingId: null });
    }
  },
}));
