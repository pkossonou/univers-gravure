"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { cn, fcfa } from "@/lib/format";
import type { Estimate } from "@/lib/types";

export interface EstimateInput {
  product_id?: number | null;
  project_type?: string | null;
  quantity: number;
  width_mm?: number | null;
  height_mm?: number | null;
  material_id?: number | null;
  finish_id?: number | null;
  size?: string | null;
  personalizations?: string[];
  has_logo?: boolean;
  urgency?: string;
}

/** Estimation calculée par l'API (moteur tarifaire du back-office) — jamais côté navigateur. */
export function useEstimate(input: EstimateInput, enabled = true) {
  const body = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null && v !== undefined && v !== ""));
  return useQuery({
    queryKey: ["estimate", body],
    queryFn: () => api<{ data: Estimate }>("/pricing/estimate", { method: "POST", body }).then((r) => r.data),
    enabled: enabled && (!!input.product_id || !!input.project_type) && input.quantity > 0,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

export function EstimateDisplay({ estimate, loading, compact, className }: { estimate?: Estimate; loading?: boolean; compact?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-5", className)} aria-live="polite" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Estimation</p>
        {loading && <span className="size-3 animate-spin rounded-full border border-accent border-t-transparent" aria-hidden />}
      </div>
      {!estimate ? (
        <p className="mt-3 text-sm text-mute">Choisissez vos options pour voir une estimation.</p>
      ) : (
          <motion.div key={`${estimate.confidence}-${estimate.estimate_min}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {estimate.confidence === "needs_review" ? (
              <>
                <p className="mt-3 text-base font-medium text-ink">{estimate.label}</p>
                {estimate.estimate_min && <p className="mt-1 text-sm text-mute">Ordre de grandeur : à partir de {fcfa(estimate.estimate_min)}</p>}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-mute">{estimate.label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">
                  {fcfa(estimate.estimate_min)}
                  {estimate.confidence === "from" && estimate.estimate_max && estimate.estimate_max > (estimate.estimate_min ?? 0) && (
                    <span className="text-lg font-normal text-mute"> – {fcfa(estimate.estimate_max)}</span>
                  )}
                </p>
              </>
            )}
            {!compact && estimate.breakdown.length > 0 && (
              <details className="mt-4 group">
                <summary className="cursor-pointer text-sm text-accent-strong">Voir le détail</summary>
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
                  {estimate.breakdown.map((l, i) => (
                    <li key={i} className="flex justify-between gap-4">
                      <span className="text-mute">{l.label}</span>
                      <span className={cn("font-mono tabular-nums", l.amount < 0 ? "text-success" : "text-ink")}>{l.amount < 0 ? "−" : ""}{fcfa(Math.abs(l.amount))}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {estimate.reasons.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-warning">
                {estimate.reasons.map((r) => <li key={r}>• {r}</li>)}
              </ul>
            )}
            <p className="mt-3 font-mono text-[0.68rem] text-faint">
              Délai estimé {estimate.lead_time_days.min}–{estimate.lead_time_days.max} jours ouvrés · {estimate.disclaimer}
            </p>
          </motion.div>
      )}
    </div>
  );
}
