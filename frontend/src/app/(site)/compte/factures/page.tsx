"use client";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/primitives";
import { download } from "@/lib/api";
import { date, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Invoice, Paginated } from "@/lib/types";

export default function MyInvoices() {
  const { data, isPending, error, refetch } = useApi<Paginated<Invoice>>("/me/invoices");
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending) return <Skeleton className="h-60 rounded-3xl" />;
  if (!data?.data.length) return <EmptyState title="Aucune facture" />;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <ul className="divide-y divide-line">
        {data.data.map((i) => (
          <li key={i.id} className="grid items-center gap-2 p-5 md:grid-cols-[10rem_1fr_auto_auto_auto] md:gap-6">
            <span className="font-mono text-sm text-ink">{i.number}</span>
            <span className="text-sm text-mute">Émise le {date(i.issued_at)}{i.order ? ` · ${i.order.number}` : ""}</span>
            <span className="text-sm text-ink">{fcfa(i.total)} {i.balance > 0 && <span className="text-warning">· reste {fcfa(i.balance)}</span>}</span>
            <StatusBadge status={i.is_overdue ? "unpaid" : i.status} label={i.is_overdue ? "En retard" : i.status_label} />
            <Button size="sm" variant="secondary" onClick={() => download(`/me/invoices/${i.id}/pdf`, undefined, `${i.number}.pdf`)}>PDF</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
