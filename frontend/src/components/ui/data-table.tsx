"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/format";
import { Button } from "./button";
import { Input } from "./field";
import { EmptyState, ErrorState, Skeleton } from "./primitives";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Colonne triable côté serveur (nom de colonne API) */
  sort?: string;
  align?: "left" | "right";
  className?: string;
  /** Masquée par défaut (réactivable via « Colonnes ») */
  hidden?: boolean;
  /** Masquée sur mobile */
  desktopOnly?: boolean;
}

export interface TableState {
  page: number;
  sort: string;
  search: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  meta?: { current_page: number; last_page: number; total: number };
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  state: TableState;
  onStateChange: (s: TableState) => void;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  selectable?: boolean;
  bulkActions?: (selected: T[]) => React.ReactNode;
  onExport?: () => void;
  empty?: { title: string; body?: string; action?: React.ReactNode };
  storageKey?: string;
}

/**
 * Tableau de données unique du back-office : recherche (débouncée), tri, pagination serveur,
 * sélection + actions groupées, export, colonnes configurables (mémorisées localement).
 */
export function DataTable<T>({
  columns,
  rows,
  meta,
  loading,
  error,
  onRetry,
  state,
  onStateChange,
  rowKey,
  onRowClick,
  searchPlaceholder = "Rechercher…",
  toolbar,
  selectable,
  bulkActions,
  onExport,
  empty,
  storageKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState(state.search);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(columns.filter((c) => c.hidden).map((c) => c.key)));
  const [showCols, setShowCols] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(`cols:${storageKey}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
      if (saved) setHidden(new Set(JSON.parse(saved)));
    } catch {
      /* préférences indisponibles */
    }
  }, [storageKey]);

  useEffect(() => {
    const t = setTimeout(() => search !== state.search && onStateChange({ ...state, search, page: 1 }), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => columns.filter((c) => !hidden.has(c.key)), [columns, hidden]);
  const selectedRows = (rows ?? []).filter((r) => selected.has(rowKey(r)));

  const toggleCol = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHidden(next);
    try {
      if (storageKey) localStorage.setItem(`cols:${storageKey}`, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const sortBy = (col: Column<T>) => {
    if (!col.sort) return;
    const current = state.sort.replace("-", "");
    const next = current === col.sort && !state.sort.startsWith("-") ? `-${col.sort}` : col.sort;
    onStateChange({ ...state, sort: next, page: 1 });
  };

  const allChecked = !!rows?.length && rows.every((r) => selected.has(rowKey(r)));

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="relative min-w-52 flex-1">
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" aria-hidden>
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="h-10 pl-10" />
        </div>
        {toolbar}
        <div className="relative">
          <Button size="sm" variant="ghost" onClick={() => setShowCols((v) => !v)} aria-expanded={showCols}>
            Colonnes
          </Button>
          {showCols && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-line-strong bg-raised p-2 shadow-xl">
              {columns.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-mute hover:bg-surface hover:text-ink">
                  <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => toggleCol(c.key)} className="accent-[var(--accent)]" />
                  {c.header}
                </label>
              ))}
            </div>
          )}
        </div>
        {onExport && (
          <Button size="sm" variant="secondary" onClick={onExport}>
            Exporter
          </Button>
        )}
      </div>

      {selectable && selectedRows.length > 0 && (
        <div className="flex items-center gap-3 border-b border-line bg-accent/5 px-4 py-2 text-sm">
          <span className="text-ink">{selectedRows.length} sélectionné(s)</span>
          {bulkActions?.(selectedRows)}
          <button className="ml-auto text-mute hover:text-ink" onClick={() => setSelected(new Set())}>
            Désélectionner
          </button>
        </div>
      )}

      {error ? (
        <ErrorState message={error.message} onRetry={onRetry} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {selectable && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Tout sélectionner"
                      checked={allChecked}
                      onChange={() => setSelected(allChecked ? new Set() : new Set((rows ?? []).map(rowKey)))}
                      className="accent-[var(--accent)]"
                    />
                  </th>
                )}
                {visible.map((c) => {
                  const active = state.sort.replace("-", "") === c.sort;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={active ? (state.sort.startsWith("-") ? "descending" : "ascending") : undefined}
                      className={cn("px-4 py-3 font-mono text-[0.68rem] font-normal tracking-[0.14em] text-faint uppercase", c.align === "right" && "text-right", c.desktopOnly && "hidden md:table-cell")}
                    >
                      {c.sort ? (
                        <button onClick={() => sortBy(c)} className={cn("inline-flex items-center gap-1 uppercase hover:text-ink", active && "text-ink")}>
                          {c.header}
                          <span aria-hidden>{active ? (state.sort.startsWith("-") ? "↓" : "↑") : "↕"}</span>
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && !rows
                ? Array.from({ length: 6 }, (_, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      {selectable && <td className="px-4 py-4" />}
                      {visible.map((c) => (
                        <td key={c.key} className={cn("px-4 py-4", c.desktopOnly && "hidden md:table-cell")}>
                          <Skeleton className="h-4 w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows?.map((row) => {
                    const key = rowKey(row);
                    return (
                      <tr
                        key={key}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row) : undefined}
                        tabIndex={onRowClick ? 0 : undefined}
                        className={cn("border-b border-line transition-colors last:border-0", onRowClick && "cursor-pointer hover:bg-raised/60 focus:bg-raised/60 focus:outline-none", selected.has(key) && "bg-accent/5")}
                      >
                        {selectable && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label="Sélectionner la ligne"
                              checked={selected.has(key)}
                              onChange={() => {
                                const next = new Set(selected);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                setSelected(next);
                              }}
                              className="accent-[var(--accent)]"
                            />
                          </td>
                        )}
                        {visible.map((c) => (
                          <td key={c.key} className={cn("px-4 py-3 text-ink", c.align === "right" && "text-right tabular-nums", c.desktopOnly && "hidden md:table-cell", c.className)}>
                            {c.cell(row)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {rows && rows.length === 0 && <EmptyState title={empty?.title ?? "Aucun résultat"} body={empty?.body ?? (state.search ? "Essayez une autre recherche." : undefined)} action={empty?.action} />}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-mute">
          <span className="font-mono text-xs">
            {meta.total} résultat{meta.total > 1 ? "s" : ""} · page {meta.current_page}/{meta.last_page}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={state.page <= 1} onClick={() => onStateChange({ ...state, page: state.page - 1 })}>
              Précédent
            </Button>
            <Button size="sm" variant="secondary" disabled={state.page >= meta.last_page} onClick={() => onStateChange({ ...state, page: state.page + 1 })}>
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Colonne CSV générique côté navigateur pour les exports rapides de liste. */
export function exportCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = "﻿" + [headers, ...rows].map((r) => r.map(escape).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
