"use client";

import { useState } from "react";
import { BarList, TrendChart, type TrendPoint } from "@/components/admin/charts";
import { CompletenessNotice, type FinanceSummary, PeriodPicker, type PeriodValue, periodQuery } from "@/components/admin/finance-bits";
import { PageTitle } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, ErrorState, Skeleton, StatCard, Tabs } from "@/components/ui/primitives";
import { download } from "@/lib/api";
import { date, fcfa, percent } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface Breakdown {
  expenses_by_category: { label: string; amount: number; is_direct_cost: number }[];
  revenue_by_category: { label: string; amount: number }[];
  revenue_by_product: { label: string; amount: number; quantity: number }[];
  revenue_by_client: { label: string; amount: number }[];
}

interface Finance {
  summary: FinanceSummary;
  timeseries: { granularity: string; points: TrendPoint[] };
  breakdown: Breakdown;
  definitions: Record<string, string>;
}

type View = "revenue" | "expenses" | "result";

export default function FinancePage() {
  const [period, setPeriod] = useState<PeriodValue>({ period: "year" });
  const [view, setView] = useState<View>("revenue");
  const [dimension, setDimension] = useState<"category" | "product" | "client">("category");
  const { data, isPending, error, refetch } = useApi<{ data: Finance }>("/admin/finance", periodQuery(period));
  const f = data?.data;
  const s = f?.summary;

  const seriesFor: Record<View, ("revenue" | "expenses" | "result" | "cash_in")[]> = { revenue: ["revenue"], expenses: ["expenses"], result: ["revenue", "expenses", "result"] };

  return (
    <>
      <PageTitle
        title="Analyse financière"
        description={s ? `Du ${date(s.period.from)} au ${date(s.period.to)} — calculée depuis les factures, recettes et dépenses enregistrées` : undefined}
        actions={
          <>
            <PeriodPicker value={period} onChange={setPeriod} />
            <Button variant="secondary" size="sm" onClick={() => download("/admin/reports/financial", { ...periodQuery(period), format: "pdf" }, "rapport-financier.pdf")}>PDF</Button>
            <Button variant="secondary" size="sm" onClick={() => download("/admin/reports/financial", { ...periodQuery(period), format: "csv" }, "rapport-financier.csv")}>Excel / CSV</Button>
          </>
        }
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isPending || !f || !s ? (
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="CA" value={fcfa(s.revenue.total)} delta={s.variation?.revenue} hint={`dont ${fcfa(s.revenue.other)} hors facture`} />
            <StatCard label="Dépenses" value={fcfa(s.expenses.total)} delta={s.variation?.expenses} hint={`${fcfa(s.expenses.direct)} directes`} />
            <StatCard label="Marge brute estimée" value={fcfa(s.gross_margin.amount)} hint={percent(s.gross_margin.rate)} />
            <StatCard label="Résultat calculé" value={fcfa(s.result.amount)} delta={s.variation?.result} tone={s.result.completeness.is_complete ? "default" : "warning"} hint={percent(s.result.rate)} />
            <StatCard label="Commandes" value={s.orders.count} delta={s.variation?.orders} hint={`panier moyen ${fcfa(s.orders.average)}`} />
            <StatCard label="Encaissements" value={fcfa(s.cash_in)} hint={`créances ${fcfa(s.receivables)}`} />
          </div>
          <CompletenessNotice summary={s} />

          <Card>
            <CardHeader
              title="Évolution"
              description={`Regroupement par ${f.timeseries.granularity === "day" ? "jour" : f.timeseries.granularity === "week" ? "semaine" : "mois"}`}
              action={<Tabs tabs={[{ value: "revenue", label: "CA" }, { value: "expenses", label: "Dépenses" }, { value: "result", label: "Bénéfice" }]} value={view} onChange={setView} />}
            />
            <div className="p-5"><TrendChart points={f.timeseries.points} granularity={f.timeseries.granularity} series={seriesFor[view]} height={340} /></div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Répartition du chiffre d'affaires"
                description="Lignes de commandes facturées (hors remises globales et taxes)"
                action={<Tabs tabs={[{ value: "category", label: "Catégorie" }, { value: "product", label: "Produit" }, { value: "client", label: "Client" }]} value={dimension} onChange={setDimension} />}
              />
              <div className="p-5">
                <BarList
                  rows={(dimension === "category" ? f.breakdown.revenue_by_category : dimension === "product" ? f.breakdown.revenue_by_product : f.breakdown.revenue_by_client).map((r) => ({
                    label: r.label,
                    value: r.amount,
                    hint: "quantity" in r ? `${r.quantity} pièce(s)` : undefined,
                  }))}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Répartition des dépenses" description="Les coûts directs entrent dans la marge brute" />
              <div className="p-5">
                <BarList rows={f.breakdown.expenses_by_category.map((e) => ({ label: `${e.label}${Number(e.is_direct_cost) ? " · direct" : ""}`, value: e.amount }))} />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Définitions" description="Ce que mesure chaque indicateur" />
            <dl className="grid gap-4 p-5 md:grid-cols-2">
              {Object.entries(f.definitions).map(([k, v]) => (
                <div key={k} className="text-sm">
                  <dt className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">{k.replace("_", " ")}</dt>
                  <dd className="mt-1 text-mute">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}
    </>
  );
}
