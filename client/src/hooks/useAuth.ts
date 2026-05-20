import { useEffect, useState, useCallback } from "react";

export interface AuthUser {
  id: number;
  openId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

let cachedState: AuthState = { user: null, loading: true };
const listeners = new Set<(s: AuthState) => void>();

function setState(next: Partial<AuthState>) {
  cachedState = { ...cachedState, ...next };
  listeners.forEach((l) => l(cachedState));
}

async function fetchMe() {
  try {
    const resp = await fetch("/api/auth/me", { credentials: "include" });
    const data = await resp.json();
    setState({ user: data.user ?? null, loading: false });
  } catch {
    setState({ user: null, loading: false });
  }
}

// Initial fetch (singleton)
let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  fetchMe();
}

export function useAuth() {
  ensureInitialized();
  const [state, setLocal] = useState<AuthState>(cachedState);

  useEffect(() => {
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);

  const refresh = useCallback(() => {
    setState({ loading: true });
    return fetchMe();
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setState({ user: null, loading: false });
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    isAuthenticated: !!state.user,
    refresh,
    logout,
  };
}

/**
 * Build the Manus OAuth login URL for redirecting to login.
 * State carries the return path so we land back on the same page after login.
 */
export function getLoginUrl(returnPath?: string): string {
  const portal = (import.meta.env.VITE_OAUTH_PORTAL_URL ?? "").replace(/\/+$/, "");
  const appId = import.meta.env.VITE_APP_ID;
  if (!portal || !appId) return "/";

  const origin = window.location.origin;
  const callbackUrl = `${origin}/api/oauth/callback`;
  const finalReturn = returnPath ?? window.location.pathname + window.location.search;

  const state = btoa(JSON.stringify({ returnPath: finalReturn })).replace(/=/g, "");

  const url = new URL(portal);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", state);
  return url.toString();
}
