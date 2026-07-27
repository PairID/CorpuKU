"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/session";

type ClientResult<T> = { data: T | null; error: { message: string } | null };

function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : { user: null })
      .then((result) => setUser(result.user || null))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setUser(null);
      })
      .finally(() => setIsPending(false));
    return () => controller.abort();
  }, []);

  return { data: { session: user ? { authenticated: true } : null, user }, isPending };
}

export const authClient = {
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
      return { error: null };
    } catch {
      return { error: { message: "Gagal mengakhiri sesi." } };
    }
  },
  useSession,
};
