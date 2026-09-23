"use client";

import { useState } from "react";
import { PeriodPicker, type PeriodValue, periodQuery } from "@/components/admin/finance-bits";
import { PageTitle } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { download } from "@/lib/api";
import { cn, dateTime, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";

const TYPES: Record<string, { label: string; body: string }> = {
  financial: { label: "Rapport financier", body: "CA, dépenses, marge, résultat et évolution par période." },
  sales: { label: "Rapport des ventes", body: "Toutes les commandes : client, statut, paiement, montant." },
  clients: { label: "Rapport clients", body: "Clients, type, nombre de commandes et CA facturé." },
  expenses: { label: "Rapport des dépenses", body: "Détail des dépenses par catégorie et fournisseur." },
  production: { label: "Rapport de production", body: "Ordres de fabrication, délais, retards." },
};

interface Report {
  title: string;
  kpis: { label: string; value: string | number }[];
  columns: string[];
  rows: (string | number)[][];
  notes?: string[];
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodValue>({ period: "month" });
  const [type, setType] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const index = useApi<{ data: { id: number; type: string; format: string; period_start: string; period_end: string; created_at: string; generator?: { name: string } }[]; available: string[] }>("/admin/reports");
  const preview = useApi<{ data: Report }>(type ? `/admin/reports/${type}` : null, periodQuery(period));
  const available = index.data?.available ?? [];

  const exportAs = async (t: string, format: "pdf" | "csv") => {
    setBusy(`${t}-${format}`);
    try {
      await download(`/admin/reports/${t}`, { ...periodQuery(period), format }, `rapport-${t}.${format}`);
      index.refetch();
    } catch {
      toast.error("Export impossible");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageTitle title="Rapports" description="Générés à partir des données de la plateforme, exportables en PDF ou Excel (CSV)." actions={<PeriodPicker value={period} onChange={setPeriod} />} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Object.entries(TYPES).filter(([k]) => available.includes(k)).map(([k, t]) => (
          <Card key={k} className={cn("flex flex-col p-5 transition", type === k && "border-accent")}>
            <p className="font-semibold text-ink">{t.label}</p>
            <p className="mt-1 flex-1 text-sm text-mute">{t.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setType(k)}>Aperçu</Button>
              <Button size="sm" variant="ghost" loading={busy === `${k}-pdf`} onClick={() => exportAs(k, "pdf")}>PDF</Button>
              <Button size="sm" variant="ghost" loading={busy === `${k}-csv`} onClick={() => exportAs(k, "csv")}>CSV</Button>
            </div>
          </Card>
        ))}
      </div>

      {type && (
        <Card className="mt-6">
          <CardHeader title={preview.data?.data.title ?? TYPES[type].label} />
          {preview.isPending ? <Skeleton className="m-5 h-40" /> : preview.data && (
            <div className="p-5">
              {preview.data.data.kpis.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-6">
                  {preview.data.data.kpis.map((k) => (
                    <div key={k.label}><p className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">{k.label}</p><p className="font-semibold text-ink">{k.value}</p></div>
                  ))}
                </div>
              )}
              {preview.data.data.notes?.map((n) => <p key={n} className="mb-2 text-sm text-warning">{n}</p>)}
              {preview.data.data.rows.length === 0 ? <EmptyState title="Aucune donnée sur la période" /> : (
                <div className="max-h-[28rem] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface"><tr className="border-b border-line">{preview.data.data.columns.map((c) => <th key={c} className="px-3 py-2 text-left font-mono text-[0.65rem] font-normal tracking-widest text-faint uppercase">{c}</th>)}</tr></thead>
                    <tbody>
                      {preview.data.data.rows.slice(0, 200).map((r, i) => (
                        <tr key={i} className="border-b border-line">{r.map((c, j) => <td key={j} className={cn("px-3 py-2 text-ink", typeof c === "number" && "text-right font-mono tabular-nums")}>{typeof c === "number" ? fcfa(c, false) : c}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Historique des exports" />
        <ul className="divide-y divide-line">
          {index.data?.data.length ? index.data.data.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="text-ink">{TYPES[r.type]?.label} · <span className="uppercase">{r.format}</span></span>
              <span className="text-mute">{r.period_start?.slice(0, 10)} → {r.period_end?.slice(0, 10)}</span>
              <span className="font-mono text-xs text-faint">{r.generator?.name} · {dateTime(r.created_at)}</span>
            </li>
          )) : <li className="px-5 py-6 text-center text-sm text-mute">Aucun export pour le moment.</li>}
        </ul>
      </Card>
    </>
  );
}
