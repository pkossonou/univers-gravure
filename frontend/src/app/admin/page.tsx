"use client";

import Link from "next/link";
import { useState } from "react";
import { BarList, TrendChart, type TrendPoint } from "@/components/admin/charts";
import { CompletenessNotice, type FinanceSummary, PeriodPicker, type PeriodValue, periodQuery } from "@/components/admin/finance-bits";
import { PageTitle } from "@/components/admin/shell";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, ErrorState, Skeleton, StatCard } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { cn, date, fcfa, percent } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Project } from "@/lib/types";

interface Dashboard {
  period: { from: string; to: string };
  operations: Record<string, number | null>;
  top_products: { product_id: number; name: string; requests: number; ordered_quantity: number }[];
  recent_projects: Project[];
  production_due: { id: number; number: string; order: string; client: string; due_at: string; priority: string; progress: number; is_late: boolean }[];
  low_stock_items: { id: number; name: string; sku: string; unit: string; quantity: number; alert_threshold: number }[];
  finance: null | {
    summary: FinanceSummary;
    timeseries: { granularity: string; points: TrendPoint[] };
    expenses_by_category: { label: string; amount: number }[];
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodValue>({ period: "month" });
  const { data, isPending, error, refetch } = useApi<{ data: Dashboard }>("/admin/dashboard", periodQuery(period));
  const d = data?.data;
  const ops = d?.operations ?? {};
  const f = d?.finance;

  return (
    <>
      <PageTitle title={`Bonjour ${user?.name.split(" ")[0] ?? ""}`} description={d ? `Du ${date(d.period.from)} au ${date(d.period.to)}` : "Vue d'ensemble de l'activité"} actions={<PeriodPicker value={period} onChange={setPeriod} />} />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isPending || !d ? (
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 1. Finances — lisible en quelques secondes */}
          {f && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Chiffre d'affaires" value={fcfa(f.summary.revenue.total)} delta={f.summary.variation?.revenue} hint="vs période préc." />
                <StatCard label="Dépenses" value={fcfa(f.summary.expenses.total)} delta={f.summary.variation?.expenses} hint="vs période préc." />
                <StatCard label="Marge brute estimée" value={fcfa(f.summary.gross_margin.amount)} hint={`${percent(f.summary.gross_margin.rate)} du CA · coûts directs`} />
                <StatCard
                  label="Résultat calculé"
                  value={fcfa(f.summary.result.amount)}
                  tone={f.summary.result.completeness.is_complete ? (f.summary.result.amount < 0 ? "danger" : "default") : "warning"}
                  hint={f.summary.result.completeness.is_complete ? "sur les données saisies" : "charges incomplètes"}
                />
              </div>
              <CompletenessNotice summary={f.summary} />
            </>
          )}

          {/* 2. Activité */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Clients" value={ops.clients_total} hint={`+${ops.new_clients} sur la période`} />
            <StatCard label="Demandes à traiter" value={ops.projects_to_handle} tone={(ops.projects_to_handle ?? 0) > 0 ? "warning" : "default"} hint={`${ops.new_projects} reçues`} />
            <StatCard label="Devis en attente" value={ops.quotes_pending} hint={ops.quotes_pending_amount !== null ? fcfa(ops.quotes_pending_amount) : undefined} />
            <StatCard label="En production" value={ops.orders_in_production} hint={`${ops.orders_ready} prête(s)`} />
            <StatCard label="Terminées" value={ops.orders_completed} hint={`taux de transformation ${percent(ops.quote_conversion_rate)}`} />
            <StatCard label="En retard" value={ops.orders_late} tone={(ops.orders_late ?? 0) > 0 ? "danger" : "default"} hint={`${ops.low_stock} alerte(s) stock`} />
          </div>

          {f && (
            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <Card>
                <CardHeader title="Évolution du CA, des dépenses et du résultat" description="Montants en FCFA — un seul axe" />
                <div className="p-5"><TrendChart points={f.timeseries.points} granularity={f.timeseries.granularity} /></div>
              </Card>
              <Card>
                <CardHeader title="Dépenses par catégorie" action={<Link href="/admin/depenses" className="text-sm text-accent-strong">Détail →</Link>} />
                <div className="p-5"><BarList rows={f.expenses_by_category.slice(0, 7).map((e) => ({ label: e.label, value: e.amount }))} /></div>
              </Card>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader title="Produits les plus demandés" />
              <div className="p-5">
                <BarList rows={d.top_products.map((p) => ({ label: p.name, value: p.requests, hint: `${p.ordered_quantity} pièces commandées` }))} format={(v) => `${v} demande${v > 1 ? "s" : ""}`} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Production à venir" action={<Link href="/admin/production" className="text-sm text-accent-strong">Atelier →</Link>} />
              <ul className="divide-y divide-line">
                {d.production_due.length ? d.production_due.map((p) => (
                  <li key={p.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-mono text-ink">{p.order}</span>
                      <span className={cn("font-mono text-xs", p.is_late ? "text-danger" : "text-mute")}>{p.is_late ? "En retard · " : ""}{date(p.due_at)}</span>
                    </div>
                    <p className="truncate text-xs text-mute">{p.client}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Avancement ${p.order}`}>
                      <div className="h-full rounded-full bg-accent" style={{ width: `${p.progress}%` }} />
                    </div>
                  </li>
                )) : <li className="px-5 py-8 text-center text-sm text-mute">Aucun ordre de production en attente.</li>}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Dernières demandes" action={<Link href="/admin/demandes" className="text-sm text-accent-strong">Tout voir →</Link>} />
              <ul className="divide-y divide-line">
                {d.recent_projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/demandes/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-raised">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-accent-strong">{p.number}</p>
                        <p className="truncate text-sm text-ink">{p.contact_name} — {p.project_type_label}</p>
                      </div>
                      <StatusBadge status={p.status} label={p.status_label} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {d.low_stock_items.length > 0 && (
            <Card className="border-warning/40">
              <CardHeader title="Stock faible" action={<Link href="/admin/stock?low=1" className="text-sm text-accent-strong">Gérer le stock →</Link>} />
              <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
                {d.low_stock_items.map((s) => (
                  <li key={s.id} className="bg-surface px-5 py-3 text-sm">
                    <p className="text-ink">{s.name}</p>
                    <p className="font-mono text-xs text-warning">{s.quantity} {s.unit} restant(s) · seuil {s.alert_threshold}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
