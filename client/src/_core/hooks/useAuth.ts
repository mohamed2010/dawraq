"use client";

import { api, ApiError, useApiCache } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

export function useAuth() {
  const queryClient = useApiCache();
  const logoutMutation = api.auth.logout.useMutation();
  const [user, setUser] = useState<{ id: number; name: string | null; email: string; role: "user" | "admin" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (!response.ok) throw new Error("تعذر التحقق من جلسة الحساب.");
      const nextUser = await response.json() as typeof user;
      setUser(nextUser);
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
      setUser(null);
    }
  }, [logoutMutation, queryClient]);

  return { user, loading: loading || logoutMutation.isPending, error: error ?? logoutMutation.error ?? null, isAuthenticated: Boolean(user), refresh, logout };
}
