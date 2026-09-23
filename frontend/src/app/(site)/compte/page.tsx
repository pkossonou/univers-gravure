"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton, StatCard, Timeline } from "@/components/ui/primitives";
import { date, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Project } from "@/lib/types";

interface Overview {
  projects: number;
  open_quotes: number;
  active_orders: number;
  balance_due: number;
  recent_projects: Project[];
}

export default function AccountHome() {
  const { data, isPending, error, refetch } = useApi<{ data: Overview }>("/me/overview");
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  const o = data?.data;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {isPending || !o ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Demandes" value={o.projects} />
            <StatCard label="Devis à valider" value={o.open_quotes} tone={o.open_quotes ? "warning" : "default"} hint={o.open_quotes ? <Link href="/compte/devis" className="text-accent-strong">Consulter →</Link> : undefined} />
            <StatCard label="Commandes en cours" value={o.active_orders} />
            <StatCard label="Solde à régler" value={fcfa(o.balance_due)} />
          </>
        )}
      </div>

      <section>
        <h2 className="mb-5 text-xl font-semibold text-ink">Vos derniers projets</h2>
        {o && o.recent_projects.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface">
            <EmptyState title="Aucun projet pour l'instant" body="Configurez un trophée ou décrivez votre idée : une estimation s'affiche immédiatement." action={<ButtonLink href="/studio">Créer mon premier projet</ButtonLink>} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {o?.recent_projects.map((p) => (
              <Link key={p.id} href={`/compte/demandes/${p.id}`} className="block rounded-3xl border border-line bg-surface p-6 transition hover:border-accent/40">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-accent-strong">{p.number}</p>
                    <p className="mt-1 font-medium text-ink">{p.title ?? p.project_type_label}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-faint">{date(p.created_at)}</span>
                    {p.timeline && <StatusBadge status={p.timeline.status} label={p.timeline.status_label} />}
                  </div>
                </div>
                {p.timeline && <Timeline stages={p.timeline.stages} />}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
