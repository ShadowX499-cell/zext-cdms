import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SECRETARY';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  pendingUserId: string | null;
  sessionTimer: ReturnType<typeof setTimeout> | null;
  warnTimer: ReturnType<typeof setTimeout> | null;
  showSessionWarning: boolean;

  setUser: (user: AuthUser, token: string) => void;
  setPendingUserId: (id: string | null) => void;
  setAccessToken: (token: string) => void;
  clearSession: () => void;
  startSessionTimer: (onWarn: () => void, onExpire: () => void) => void;
  resetSessionTimer: (onWarn: () => void, onExpire: () => void) => void;
  dismissWarning: () => void;
}

const WARN_MS = 25 * 60 * 1000;
const EXPIRE_MS = 30 * 60 * 1000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      pendingUserId: null,
      sessionTimer: null,
      warnTimer: null,
      showSessionWarning: false,

      setUser(user, token) {
        set({ user, accessToken: token, pendingUserId: null });
      },

      setPendingUserId(id) {
        set({ pendingUserId: id });
      },

      setAccessToken(token) {
        set({ accessToken: token });
      },

      clearSession() {
        const { sessionTimer, warnTimer } = get();
        if (sessionTimer) clearTimeout(sessionTimer);
        if (warnTimer) clearTimeout(warnTimer);
        if (typeof document !== 'undefined') {
          document.cookie = 'zext-auth-check=; path=/; max-age=0; SameSite=Strict';
        }
        set({
          user: null,
          accessToken: null,
          pendingUserId: null,
          sessionTimer: null,
          warnTimer: null,
          showSessionWarning: false,
        });
      },

      startSessionTimer(onWarn, onExpire) {
        const { sessionTimer, warnTimer } = get();
        if (sessionTimer) clearTimeout(sessionTimer);
        if (warnTimer) clearTimeout(warnTimer);

        const warn = setTimeout(() => {
          set({ showSessionWarning: true });
          onWarn();
        }, WARN_MS);

        const expire = setTimeout(() => {
          get().clearSession();
          onExpire();
        }, EXPIRE_MS);

        set({ warnTimer: warn, sessionTimer: expire, showSessionWarning: false });
      },

      resetSessionTimer(onWarn, onExpire) {
        get().startSessionTimer(onWarn, onExpire);
      },

      dismissWarning() {
        set({ showSessionWarning: false });
      },
    }),
    {
      name: 'zext-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        pendingUserId: s.pendingUserId,
      }),
    },
  ),
);

export const isAdmin = (state: AuthState) =>
  state.user?.role === 'SUPER_ADMIN';
