"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact, fcfa } from "@/lib/format";

/**
 * Palette validée (scripts dataviz, surface #fbfaf6, toutes paires) :
 * CA = laiton, Dépenses = bleu, Résultat = vert. Ordre fixe, jamais recyclé.
 */
export const SERIES = {
  revenue: { color: "#b07d1a", label: "Chiffre d'affaires" },
  expenses: { color: "#3060c8", label: "Dépenses" },
  result: { color: "#15906a", label: "Résultat calculé" },
  cash_in: { color: "#b07d1a", label: "Encaissements" },
} as const;

type SeriesKey = keyof typeof SERIES;

export interface TrendPoint {
  bucket: string;
  revenue: number;
  expenses: number;
  result: number;
  cash_in: number;
}

function bucketLabel(bucket: string, granularity: string) {
  if (granularity === "month") {
    const [y, m] = bucket.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-FR", { month: "short" });
  }
  return new Date(`${bucket}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/** Courbes sur UN seul axe (même unité : FCFA), réticule + infobulle, légende + tableau. */
export function TrendChart({ points, granularity, series = ["revenue", "expenses", "result"], height = 300 }: { points: TrendPoint[]; granularity: string; series?: SeriesKey[]; height?: number }) {
  const [table, setTable] = useState(false);
  const data = points.map((p) => ({ ...p, label: bucketLabel(p.bucket, granularity) }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {series.map((s) => (
          <span key={s} className="flex items-center gap-2 text-xs text-mute">
            <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES[s].color }} aria-hidden />
            {SERIES[s].label}
          </span>
        ))}
        <button type="button" onClick={() => setTable((t) => !t)} className="ml-auto text-xs text-accent-strong underline-offset-4 hover:underline">
          {table ? "Voir le graphique" : "Voir le tableau"}
        </button>
      </div>
      {table ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line text-left font-mono text-[0.65rem] tracking-widest text-faint uppercase">
                <th className="py-2 font-normal">Période</th>
                {series.map((s) => <th key={s} className="py-2 text-right font-normal">{SERIES[s].label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.bucket} className="border-b border-line">
                  <td className="py-2 text-ink">{d.label}</td>
                  {series.map((s) => <td key={s} className="py-2 text-right font-mono text-ink tabular-nums">{fcfa(d[s], false)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }} role="img" aria-label={`Évolution : ${series.map((s) => SERIES[s].label).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--line-strong)" }} tick={{ fill: "var(--faint)", fontSize: 11 }} minTickGap={24} />
              <YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fill: "var(--faint)", fontSize: 11 }} width={52} />
              <Tooltip
                cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-xl border border-line-strong bg-raised px-3 py-2 text-xs shadow-lg">
                      <p className="mb-1 font-medium text-ink">{label}</p>
                      {payload.map((p) => (
                        <p key={String(p.dataKey)} className="flex items-center justify-between gap-6">
                          <span className="flex items-center gap-2 text-mute">
                            <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
                            {SERIES[p.dataKey as SeriesKey].label}
                          </span>
                          <span className="font-mono text-ink tabular-nums">{fcfa(Number(p.value))}</span>
                        </p>
                      ))}
                    </div>
                  ) : null
                }
              />
              {series.map((s) => (
                <Line key={s} type="monotone" dataKey={s} stroke={SERIES[s].color} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Barres horizontales classées, une seule teinte (la catégorie est lue par son libellé, pas sa couleur). */
export function BarList({ rows, format = fcfa, max, empty = "Aucune donnée sur la période." }: { rows: { label: string; value: number; hint?: string }[]; format?: (v: number) => string; max?: number; empty?: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-mute">{empty}</p>;
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label} : ${format(r.value)}${total ? ` (${Math.round((r.value / total) * 100)} %)` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{r.label}</span>
            <span className="shrink-0 font-mono text-xs text-mute tabular-nums">
              {format(r.value)}
              {total > 0 && <span className="ml-2 text-faint">{Math.round((r.value / total) * 100)} %</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-[width] duration-700 group-hover:brightness-110" style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }} />
          </div>
          {r.hint && <p className="mt-0.5 text-xs text-faint">{r.hint}</p>}
        </li>
      ))}
    </ul>
  );
}
