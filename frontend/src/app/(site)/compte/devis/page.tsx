"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/primitives";
import { date, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Paginated, Quote } from "@/lib/types";

export default function MyQuotes() {
  const { data, isPending, error, refetch } = useApi<Paginated<Quote>>("/me/quotes");
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending) return <Skeleton className="h-60 rounded-3xl" />;
  if (!data?.data.length) return <EmptyState title="Aucun devis pour le moment" body="Vos devis apparaîtront ici dès qu'ils seront envoyés par notre équipe." />;

  return (
    <div className="flex flex-col gap-3">
      {data.data.map((q) => (
        <Link key={q.id} href={`/compte/devis/${q.id}`} className="grid items-center gap-2 rounded-2xl border border-line bg-surface p-5 transition hover:border-accent/40 md:grid-cols-[10rem_1fr_auto_auto] md:gap-6">
          <span className="font-mono text-sm text-accent-strong">{q.number}</span>
          <span className="text-ink">{q.project?.title ?? q.project?.number ?? "Devis"}</span>
          <span className="text-sm text-mute">
            {fcfa(q.total)} · valable jusqu&apos;au {date(q.valid_until)}
          </span>
          <StatusBadge status={q.status} label={q.status === "sent" ? "À valider" : q.status_label} />
        </Link>
      ))}
    </div>
  );
}
