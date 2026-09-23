"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { TableState } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "./api";
import type { Paginated } from "./types";

/** GET typé via TanStack Query. */
export function useApi<T>(path: string | null, query?: Record<string, string | number | boolean | undefined | null>, options?: { staleTime?: number }) {
  return useQuery({
    queryKey: [path, query],
    queryFn: () => api<T>(path!, { query: query as never }),
    enabled: !!path,
    placeholderData: keepPreviousData,
    staleTime: options?.staleTime,
  });
}

/** Liste paginée + état de tableau (recherche, tri, page, filtres). */
export function useTable<T>(path: string, initialSort = "-created_at", extra?: Record<string, string | number | boolean | undefined | null>) {
  const [state, setState] = useState<TableState>({ page: 1, sort: initialSort, search: "" });
  const query = useApi<Paginated<T>>(path, { page: state.page, sort: state.sort, search: state.search || undefined, ...extra });
  return { state, setState, query };
}

/** Mutation avec toasts de succès / erreur et invalidation de cache. */
export function useAction<TVars = void, TRes = unknown>(
  fn: (vars: TVars) => Promise<TRes>,
  { success, invalidate = [] }: { success?: string | ((res: TRes) => string); invalidate?: string[] } = {},
) {
  const client = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      if (success) toast.success(typeof success === "function" ? success(res) : success);
      invalidate.forEach((key) => client.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith(key) }));
    },
    onError: (e) => toast.error("Action impossible", e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : "Erreur inattendue."),
  });
}
