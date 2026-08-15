"use client";

import { api, ApiError, useApiCache } from "@/lib/api";
import { clearActiveOfflineAccount, loadActiveOfflineAccount, saveActiveOfflineAccount } from "@/lib/offline-store";
import { useCallback, useEffect, useState } from "react";

export function useAuth() {
  const queryClient = useApiCache();
  const logoutMutation = api.auth.logout.useMutation();
  const [user, setUser] = useState<{ id: number; name: string | null; email: string; role: "user" | "admin" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = await loadActiveOfflineAccount().catch(() => null);
      setUser(cached);
      setError(cached ? null : new Error("يلزم اتصال بالإنترنت لتسجيل الدخول لأول مرة على هذا الجهاز."));
      setLoading(false);
      return cached;
    }
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (!response.ok) throw new Error("تعذر التحقق من جلسة الحساب.");
      const nextUser = await response.json() as typeof user;
      setUser(nextUser);
      if (nextUser) void saveActiveOfflineAccount(nextUser).catch(() => undefined);
      setError(null);
      return nextUser;
    } catch (caught) {
      const nextError = caught instanceof Error ? caught : new Error("تعذر التحقق من جلسة الحساب.");
      setUser(null);
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    } finally {
      queryClient.setQueryData(["auth.me"], null);
      await queryClient.invalidateQueries({ queryKey: ["auth.me"] });
      await clearActiveOfflineAccount().catch(() => undefined);
      setUser(null);
    }
  }, [logoutMutation, queryClient]);

  return { user, loading: loading || logoutMutation.isPending, error: error ?? logoutMutation.error ?? null, isAuthenticated: Boolean(user), refresh, logout };
}
