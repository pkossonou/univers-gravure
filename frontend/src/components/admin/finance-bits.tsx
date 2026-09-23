"use client";

import { DatePicker, Select } from "@/components/ui/field";

export const PERIODS = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "quarter", label: "Ce trimestre" },
  { value: "year", label: "Cette année" },
  { value: "custom", label: "Période personnalisée" },
];

export interface PeriodValue {
  period: string;
  from?: string;
  to?: string;
}

/** Sélecteur de période unique (tableau de bord, finances, rapports). */
export function PeriodPicker({ value, onChange }: { value: PeriodValue; onChange: (v: PeriodValue) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label="Période" value={value.period} onChange={(e) => onChange({ ...value, period: e.target.value })} className="h-10 w-48">
        {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </Select>
      {value.period === "custom" && (
        <>
          <DatePicker aria-label="Du" value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value })} className="h-10 w-40" />
          <DatePicker aria-label="Au" value={value.to ?? ""} onChange={(e) => onChange({ ...value, to: e.target.value })} className="h-10 w-40" />
        </>
      )}
    </div>
  );
}

export function periodQuery(v: PeriodValue) {
  return v.period === "custom" ? { period: "custom", from: v.from, to: v.to } : { period: v.period };
}

export interface FinanceSummary {
  period: { from: string; to: string };
  revenue: { total: number; invoiced: number; other: number };
  cash_in: number;
  expenses: { total: number; direct: number; overhead: number };
  gross_margin: { amount: number; rate: number | null; label: string };
  result: { amount: number; rate: number | null; label: string; completeness: { is_complete: boolean; missing: { category: string; month: string }[] } };
  orders: { count: number; amount: number; average: number };
  receivables: number;
  previous?: { revenue: number; expenses: number; result: number; orders: number };
  variation?: { revenue: number | null; expenses: number | null; result: number | null; orders: number | null };
}

/** Avertissement explicite : le résultat n'est pas un bénéfice net si des charges manquent. */
export function CompletenessNotice({ summary }: { summary: FinanceSummary }) {
  const { completeness } = summary.result;
  if (completeness.is_complete) return null;
  const grouped = completeness.missing.reduce<Record<string, string[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m.month);
    return acc;
  }, {});
  return (
    <div role="note" className="flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-warning text-xs font-bold text-white" aria-hidden>!</span>
      <div>
        <p className="font-medium text-ink">Résultat incomplet : des charges récurrentes ne sont pas encore saisies.</p>
        <p className="mt-1 text-mute">
          {Object.entries(grouped).map(([cat, months]) => `${cat} (${months.join(", ")})`).join(" · ")}. Le résultat affiché est donc surestimé et ne constitue pas un bénéfice net.
        </p>
      </div>
    </div>
  );
}
