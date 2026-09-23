"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/primitives";
import { date, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Paginated, Project } from "@/lib/types";

export default function MyProjects() {
  const [page, setPage] = useState(1);
  const { data, isPending, error, refetch } = useApi<Paginated<Project>>("/me/projects", { page });
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending) return <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  if (!data?.data.length) return <EmptyState title="Aucune demande" action={<ButtonLink href="/studio">Créer un projet</ButtonLink>} />;

  return (
    <div className="flex flex-col gap-3">
      {data.data.map((p) => (
        <Link key={p.id} href={`/compte/demandes/${p.id}`} className="grid items-center gap-2 rounded-2xl border border-line bg-surface p-5 transition hover:border-accent/40 md:grid-cols-[10rem_1fr_auto_auto] md:gap-6">
          <span className="font-mono text-sm text-accent-strong">{p.number}</span>
          <span className="text-ink">{p.title ?? p.project_type_label} <span className="text-mute">· {p.quantity} ex.</span></span>
          <span className="text-sm text-mute">{p.estimate.min ? `≈ ${fcfa(p.estimate.min)}` : "Sur étude"} · {date(p.created_at)}</span>
          {p.timeline && <StatusBadge status={p.timeline.status} label={p.timeline.status_label} />}
        </Link>
      ))}
      {data.meta.last_page > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</Button>
          <Button variant="secondary" size="sm" disabled={page >= data.meta.last_page} onClick={() => setPage(page + 1)}>Suivant</Button>
        </div>
      )}
    </div>
  );
}
