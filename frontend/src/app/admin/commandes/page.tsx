"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageTitle } from "@/components/admin/shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Tabs } from "@/components/ui/primitives";
import { cn, date, fcfa } from "@/lib/format";
import { useTable } from "@/lib/hooks";
import type { Order } from "@/lib/types";

const TABS = [
  { value: "open", label: "En cours", filter: "validated,in_design,in_production,quality_check" },
  { value: "ready", label: "Prêtes", filter: "ready" },
  { value: "done", label: "Livrées / terminées", filter: "delivered,completed" },
  { value: "cancelled", label: "Annulées", filter: "cancelled" },
  { value: "all", label: "Toutes", filter: undefined },
];
const PAYMENT = { unpaid: ["Non réglée", "danger"], partial: ["Acompte", "warning"], paid: ["Réglée", "success"] } as const;

export default function OrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState("open");
  const [late, setLate] = useState(false);
  const { state, setState, query } = useTable<Order>("/admin/orders", "due_date", { "filter[status]": TABS.find((t) => t.value === tab)?.filter, late: late || undefined });
  const counts = (query.data?.meta.counts ?? {}) as Record<string, number>;

  return (
    <>
      <PageTitle title="Commandes" description="Commandes validées, de la conception à la remise." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs tabs={TABS.map((t) => ({ value: t.value, label: t.label, count: t.filter ? t.filter.split(",").reduce((n, k) => n + (counts[k] ?? 0), 0) : Object.values(counts).reduce((a, b) => a + b, 0) }))} value={tab} onChange={(v) => (setTab(v), setState({ ...state, page: 1 }))} />
        <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" checked={late} onChange={(e) => setLate(e.target.checked)} className="accent-[var(--accent)]" />En retard uniquement</label>
      </div>
      <DataTable<Order>
        columns={[
          { key: "number", header: "N°", sort: "number", cell: (o) => <span className="font-mono text-accent-strong">{o.number}</span> },
          { key: "client", header: "Client", cell: (o) => o.client?.display_name ?? "—" },
          { key: "total", header: "Montant", sort: "total", align: "right", cell: (o) => fcfa(o.total) },
          { key: "payment", header: "Paiement", cell: (o) => <Badge tone={PAYMENT[o.payment_status][1]}>{PAYMENT[o.payment_status][0]}</Badge>, desktopOnly: true },
          { key: "progress", header: "Atelier", cell: (o) => {
            const pr = o.production?.[0]?.progress ?? 0;
            return <div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${pr}%` }} /></div><span className="font-mono text-xs text-mute">{pr}%</span></div>;
          }, desktopOnly: true },
          { key: "due_date", header: "Échéance", sort: "due_date", cell: (o) => {
            const isLate = o.due_date && new Date(o.due_date) < new Date(new Date().toDateString()) && ["validated", "in_design", "in_production", "quality_check", "ready"].includes(o.status);
            return <span className={cn(isLate && "font-medium text-danger")}>{date(o.due_date)}</span>;
          } },
          { key: "status", header: "Statut", sort: "status", cell: (o) => <StatusBadge status={o.status} label={o.status_label} /> },
        ]}
        rows={query.data?.data}
        meta={query.data?.meta}
        loading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
        state={state}
        onStateChange={setState}
        rowKey={(o) => o.id}
        onRowClick={(o) => router.push(`/admin/commandes/${o.id}`)}
        searchPlaceholder="N° de commande…"
        storageKey="orders"
      />
    </>
  );
}
