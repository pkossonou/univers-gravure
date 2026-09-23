"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, ErrorState, Skeleton, Timeline } from "@/components/ui/primitives";
import { download } from "@/lib/api";
import { cn, date, dateTime, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Order } from "@/lib/types";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error, refetch } = useApi<{ data: Order }>(`/me/orders/${id}`);
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending || !data) return <Skeleton className="h-96 rounded-3xl" />;
  const o = data.data;
  const steps = o.production?.flatMap((p) => p.steps) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/compte/commandes" className="font-mono text-xs tracking-widest text-faint hover:text-ink">← MES COMMANDES</Link>
      <Card className="p-6 md:p-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-accent-strong">{o.number}</p>
            <p className="display mt-2 text-4xl text-ink">{o.status_label}</p>
            <p className="mt-1 text-sm text-mute">Commandée le {date(o.ordered_at)} · {o.delivery_method === "delivery" ? "livraison" : "retrait à l'atelier"} prévu(e) le {date(o.due_date)}</p>
          </div>
          <StatusBadge status={o.status} label={o.status_label} />
        </div>
        {o.timeline && <Timeline stages={o.timeline.stages} />}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Avancement à l'atelier" />
          <ol className="p-5">
            {steps.length ? steps.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                <span className={cn("size-2.5 rounded-full", s.status === "done" ? "bg-success" : s.status === "in_progress" ? "animate-pulse bg-accent" : "bg-line-strong")} aria-hidden />
                <span className={s.status === "pending" ? "text-faint" : "text-ink"}>{s.name}</span>
                <span className="ml-auto font-mono text-xs text-faint">{s.status === "done" ? date(s.completed_at) : s.status === "in_progress" ? "En cours" : ""}</span>
              </li>
            )) : <li className="text-sm text-mute">Planification en cours.</li>}
          </ol>
          <div className="border-t border-line p-5">
            <p className="mb-3 text-sm font-medium text-ink">Historique</p>
            <ul className="space-y-2 text-sm">
              {o.history?.map((h, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="text-mute">{h.label}{h.comment ? ` — ${h.comment}` : ""}</span>
                  <span className="shrink-0 font-mono text-xs text-faint">{dateTime(h.date)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Contenu" />
            <ul className="divide-y divide-line">
              {o.items?.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <span className="text-ink">{i.quantity} × {i.description}</span>
                  <span className="font-mono text-ink">{fcfa(i.total ?? 0)}</span>
                </li>
              ))}
              <li className="flex justify-between px-5 py-3 font-semibold"><span className="text-ink">Total</span><span className="font-mono text-ink">{fcfa(o.total)}</span></li>
            </ul>
          </Card>
          <Card>
            <CardHeader title="Factures" />
            <ul className="divide-y divide-line">
              {o.invoices?.length ? o.invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="font-mono text-ink">{inv.number}</span>
                  <StatusBadge status={inv.status} label={inv.status_label} />
                  <Button size="sm" variant="ghost" onClick={() => download(`/me/invoices/${inv.id}/pdf`, undefined, `${inv.number}.pdf`)}>PDF</Button>
                </li>
              )) : <li className="px-5 py-4 text-sm text-mute">La facture sera émise à la mise à disposition.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
