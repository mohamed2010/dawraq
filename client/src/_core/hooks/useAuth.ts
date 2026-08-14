"use client";

import { startLogin } from "@/const";
import { api, ApiError, useApiCache } from "@/lib/api";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const queryClient = useApiCache();
  const meQuery = api.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const logoutMutation = api.auth.logout.useMutation();

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    } finally {
      try { sessionStorage.removeItem("manus-cookie"); } catch {}
      queryClient.setQueryData(["auth.me"], null);
      await queryClient.invalidateQueries({ queryKey: ["auth.me"] });
    }
  }, [logoutMutation, queryClient]);

  const state = useMemo(() => ({
    user: meQuery.data ?? null,
    loading: meQuery.isLoading || logoutMutation.isPending,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
  }), [meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("manus-runtime-user-info", JSON.stringify(meQuery.data));
  }, [meQuery.data]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || meQuery.isLoading || logoutMutation.isPending || state.user || typeof window === "undefined") return;
    if (redirectPath) window.location.href = redirectPath;
    else void startLogin();
  }, [redirectOnUnauthenticated, redirectPath, logoutMutation.isPending, meQuery.isLoading, state.user]);

  return { ...state, refresh: () => meQuery.refetch(), logout };
}
