"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/session";

type ClientResult<T> = { data: T | null; error: { message: string } | null };

const SESSION_CACHE_TTL_MS = 10_000;
let cachedUser: AuthUser | null | undefined = undefined;
let cacheExpiresAt = 0;
let inFlightSessionPromise: Promise<AuthUser | null> | null = null;
const sessionListeners = new Set<(user: AuthUser | null) => void>();

function notifySessionListeners(user: AuthUser | null) {
  for (const listener of sessionListeners) {
    listener(user);
  }
}

export function invalidateClientSession(nextUser?: AuthUser | null) {
  if (nextUser !== undefined) {
    cachedUser = nextUser;
    cacheExpiresAt = Date.now() + SESSION_CACHE_TTL_MS;
    notifySessionListeners(nextUser);
  } else {
    cachedUser = undefined;
    cacheExpiresAt = 0;
  }
  inFlightSessionPromise = null;
}

export async function getClientSession(forceRefresh = false): Promise<AuthUser | null> {
  if (!forceRefresh && cachedUser !== undefined && Date.now() < cacheExpiresAt) {
    return cachedUser;
  }
  if (!forceRefresh && inFlightSessionPromise) {
    return inFlightSessionPromise;
  }

  inFlightSessionPromise = fetch("/api/auth/session", { cache: "no-store" })
    .then(async (response) => (response.ok ? response.json() : { user: null }))
    .then((result) => {
      const user = (result.user || null) as AuthUser | null;
      cachedUser = user;
      cacheExpiresAt = Date.now() + SESSION_CACHE_TTL_MS;
      return user;
    })
    .catch(() => {
      cachedUser = null;
      cacheExpiresAt = Date.now() + 2_000;
      return null;
    })
    .finally(() => {
      inFlightSessionPromise = null;
    });

  return inFlightSessionPromise;
}

function useSession() {
  const [user, setUser] = useState<AuthUser | null>(cachedUser ?? null);
  const [isPending, setIsPending] = useState(cachedUser === undefined);

  useEffect(() => {
    let active = true;
    const listener = (nextUser: AuthUser | null) => {
      if (active) setUser(nextUser);
    };
    sessionListeners.add(listener);

    getClientSession()
      .then((resolvedUser) => {
        if (active) setUser(resolvedUser);
      })
      .finally(() => {
        if (active) setIsPending(false);
      });

    return () => {
      active = false;
      sessionListeners.delete(listener);
    };
  }, []);

  return { data: { session: user ? { authenticated: true } : null, user }, isPending };
}

export const authClient = {
  getSession: getClientSession,
  invalidateSession: invalidateClientSession,
  signIn: {
    email: async (data: { email?: string; username?: string; password: string }): Promise<ClientResult<{ user: AuthUser }>> => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: data.email || data.username, password: data.password }),
        });
        const result = await response.json();
        if (!response.ok) return { data: null, error: { message: result.error || "Login gagal." } };
        invalidateClientSession(result.user || null);
        return { data: { user: result.user }, error: null };
      } catch {
        return { data: null, error: { message: "Login gagal." } };
      }
    },
  },
  signUp: {
    email: async (data: Record<string, unknown>): Promise<ClientResult<{ user: AuthUser }>> => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) return { data: null, error: { message: result.error || "Pendaftaran gagal." } };
        invalidateClientSession(result.user || null);
        return { data: { user: result.user }, error: null };
      } catch {
        return { data: null, error: { message: "Pendaftaran gagal." } };
      }
    },
  },
  signOut: async (): Promise<{ error: { message: string } | null }> => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) return { error: { message: "Gagal mengakhiri sesi." } };
      invalidateClientSession(null);
      return { error: null };
    } catch {
      return { error: { message: "Gagal mengakhiri sesi." } };
    }
  },
  useSession,
};
