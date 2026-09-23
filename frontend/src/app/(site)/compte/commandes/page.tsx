"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/primitives";
import { date, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Order, Paginated } from "@/lib/types";

const PAYMENT = { unpaid: "Non réglée", partial: "Acompte versé", paid: "Réglée" };

export default function MyOrders() {
  const { data, isPending, error, refetch } = useApi<Paginated<Order>>("/me/orders");
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending) return <Skeleton className="h-60 rounded-3xl" />;
  if (!data?.data.length) return <EmptyState title="Aucune commande" body="Vos commandes apparaissent dès qu'un devis est validé." />;

  return (
    <div className="flex flex-col gap-3">
      {data.data.map((o) => (
        <Link key={o.id} href={`/compte/commandes/${o.id}`} className="grid items-center gap-2 rounded-2xl border border-line bg-surface p-5 transition hover:border-accent/40 md:grid-cols-[10rem_1fr_auto_auto] md:gap-6">
          <span className="font-mono text-sm text-accent-strong">{o.number}</span>
          <span className="truncate text-ink">{o.items?.map((i) => i.description).join(", ")}</span>
          <span className="text-sm text-mute">{fcfa(o.total)} · {PAYMENT[o.payment_status]} · prévue le {date(o.due_date)}</span>
          <StatusBadge status={o.status} label={o.status_label} />
        </Link>
      ))}
    </div>
  );
}
