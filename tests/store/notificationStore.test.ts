import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotificationStore } from '../../src/store/notificationStore';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', () => ({
  api: {
    getNotifications: vi.fn(),
    getUnreadNotificationCount: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

const mockNotifications = [
  {
    id: 1,
    userId: null,
    type: 'stock_low' as const,
    title: 'Stock bas',
    message: 'iPhone 15 en rupture',
    referenceType: 'product' as const,
    referenceId: 42,
    isRead: false,
    createdAt: 1700000000,
  },
  {
    id: 2,
    userId: null,
    type: 'repair_status' as const,
    title: 'Réparation',
    message: 'Réparation #5 terminée',
    referenceType: 'repair' as const,
    referenceId: 5,
    isRead: true,
    createdAt: 1700001000,
  },
];

describe('notificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset store state
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      pollingId: null,
    });
  });

  afterEach(() => {
    // Clean up any active polling
    useNotificationStore.getState().stopPolling();
    vi.useRealTimers();
  });

  describe('fetchNotifications', () => {
    it('fetches and stores notifications', async () => {
      vi.mocked(api.getNotifications).mockResolvedValue({
        notifications: mockNotifications,
        unreadCount: 1,
      });

      await useNotificationStore.getState().fetchNotifications();

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(2);
      expect(state.unreadCount).toBe(1);
      expect(state.isLoading).toBe(false);
    });

    it('sets isLoading during fetch', async () => {
      let resolvePromise: (v: unknown) => void;
      vi.mocked(api.getNotifications).mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const fetchPromise = useNotificationStore.getState().fetchNotifications();
      expect(useNotificationStore.getState().isLoading).toBe(true);

      resolvePromise!({ notifications: [], unreadCount: 0 });
      await fetchPromise;
      expect(useNotificationStore.getState().isLoading).toBe(false);
    });

    it('handles fetch errors gracefully', async () => {
      vi.mocked(api.getNotifications).mockRejectedValue(new Error('Network error'));

      await useNotificationStore.getState().fetchNotifications();

      const state = useNotificationStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.notifications).toEqual([]);
    });
  });

  describe('fetchUnreadCount', () => {
    it('updates unread count', async () => {
      vi.mocked(api.getUnreadNotificationCount).mockResolvedValue(5);

      await useNotificationStore.getState().fetchUnreadCount();

      expect(useNotificationStore.getState().unreadCount).toBe(5);
    });

    it('silently handles errors', async () => {
      vi.mocked(api.getUnreadNotificationCount).mockRejectedValue(new Error('fail'));

      // Should not throw
      await useNotificationStore.getState().fetchUnreadCount();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('markRead', () => {
    it('marks a notification as read and decrements count', async () => {
      vi.mocked(api.markNotificationRead).mockResolvedValue(undefined);
      useNotificationStore.setState({
        notifications: mockNotifications,
        unreadCount: 1,
      });

      await useNotificationStore.getState().markRead(1);

      const state = useNotificationStore.getState();
      const notification = state.notifications.find((n) => n.id === 1);
      expect(notification?.isRead).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('does not decrement unread count below 0', async () => {
      vi.mocked(api.markNotificationRead).mockResolvedValue(undefined);
      useNotificationStore.setState({
        notifications: mockNotifications,
        unreadCount: 0,
      });

      await useNotificationStore.getState().markRead(1);
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('markAllRead', () => {
    it('marks all notifications as read and resets count to 0', async () => {
      vi.mocked(api.markAllNotificationsRead).mockResolvedValue(undefined);
      useNotificationStore.setState({
        notifications: mockNotifications,
        unreadCount: 1,
      });

      await useNotificationStore.getState().markAllRead();

      const state = useNotificationStore.getState();
      expect(state.notifications.every((n) => n.isRead)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('polling', () => {
    it('starts polling at 30-second intervals', async () => {
      vi.mocked(api.getUnreadNotificationCount).mockResolvedValue(3);

      useNotificationStore.getState().startPolling();

      expect(useNotificationStore.getState().pollingId).not.toBeNull();
      // Initial fetch
      expect(api.getUnreadNotificationCount).toHaveBeenCalledTimes(1);

      // Advance 30 seconds
      await vi.advanceTimersByTimeAsync(30000);
      expect(api.getUnreadNotificationCount).toHaveBeenCalledTimes(2);

      // Another 30 seconds
      await vi.advanceTimersByTimeAsync(30000);
      expect(api.getUnreadNotificationCount).toHaveBeenCalledTimes(3);
    });

    it('does not start duplicate polling', () => {
      vi.mocked(api.getUnreadNotificationCount).mockResolvedValue(0);

      useNotificationStore.getState().startPolling();
      const firstId = useNotificationStore.getState().pollingId;

      useNotificationStore.getState().startPolling();
      const secondId = useNotificationStore.getState().pollingId;

      expect(firstId).toBe(secondId);
    });

    it('stops polling and clears interval', () => {
      vi.mocked(api.getUnreadNotificationCount).mockResolvedValue(0);

      useNotificationStore.getState().startPolling();
      expect(useNotificationStore.getState().pollingId).not.toBeNull();

      useNotificationStore.getState().stopPolling();
      expect(useNotificationStore.getState().pollingId).toBeNull();
    });
  });
});
