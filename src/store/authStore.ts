import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'manager' | 'agent';

interface User {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
}

interface AuthState {
  user: User | null;
  isChecking: boolean;
  setUser: (user: User | null) => void;
  setUserRole: (role: UserRole) => void;
  setChecking: (value: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isChecking: true,
      setUser: (user) => set({ user }),
      setUserRole: (role) => set((state) => ({
        user: state.user ? { ...state.user, role } : null
      })),
      setChecking: (value) => set({ isChecking: value }),
      reset: () => set({ user: null, isChecking: false }),
    }),
    {
      name: 'phonestore-auth',
      partialize: (state) => ({ user: state.user }), // Only persist user
    }
  )
);
