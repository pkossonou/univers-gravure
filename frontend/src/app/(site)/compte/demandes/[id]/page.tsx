"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, ErrorState, Skeleton, Timeline } from "@/components/ui/primitives";
import { bytes, date, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Project } from "@/lib/types";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error, refetch } = useApi<{ data: Project }>(`/me/projects/${id}`);
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending || !data) return <Skeleton className="h-96 rounded-3xl" />;
  const p = data.data;
  const perso = p.personalization as { text?: string; lines?: string[]; modes?: string[] } | null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/compte/demandes" className="font-mono text-xs tracking-widest text-faint hover:text-ink">← MES DEMANDES</Link>
      <Card className="p-6 md:p-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-accent-strong">{p.number}</p>
            <h2 className="display mt-2 text-3xl text-ink">{p.title ?? p.project_type_label}</h2>
            <p className="mt-1 text-sm text-mute">Envoyée le {date(p.created_at)}</p>
          </div>
          {p.timeline && <StatusBadge status={p.timeline.status} label={p.timeline.status_label} />}
        </div>
        {p.timeline && <Timeline stages={p.timeline.stages} />}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Votre demande" />
          <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
            {[
              ["Type", p.project_type_label],
              ["Produit", p.product?.name ?? "Sur mesure"],
              ["Quantité", p.quantity],
              ["Matériau", p.material?.name ?? "—"],
              ["Finition", p.finish?.name ?? "—"],
              ["Texte", perso?.lines?.join(" / ") ?? perso?.text ?? "—"],
              ["Estimation", p.estimate.min ? `${p.estimate.confidence === "from" ? "À partir de " : ""}${fcfa(p.estimate.min)}` : "Sur étude"],
              ["Date souhaitée", date(p.desired_date)],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">{k}</dt>
                <dd className="mt-0.5 text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {p.description && <p className="border-t border-line p-5 text-sm whitespace-pre-line text-mute">{p.description}</p>}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Devis" />
            <ul className="divide-y divide-line">
              {p.quotes?.length ? p.quotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/compte/devis/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-raised/50">
                    <span className="font-mono text-sm text-ink">{q.number}</span>
                    <span className="text-sm text-ink">{fcfa(q.total)}</span>
                    <StatusBadge status={q.status} label={q.status_label} />
                  </Link>
                </li>
              )) : <li className="px-5 py-4 text-sm text-mute">Votre devis est en préparation.</li>}
            </ul>
            {p.order && (
              <Link href={`/compte/commandes/${p.order.id}`} className="block border-t border-line px-5 py-4 text-sm text-accent-strong">
                Commande {p.order.number} — {p.order.status_label} →
              </Link>
            )}
          </Card>
          <Card>
            <CardHeader title="Fichiers envoyés" />
            <ul className="divide-y divide-line">
              {p.files?.length ? p.files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <a href={f.url} className="truncate text-ink hover:text-accent-strong" target="_blank" rel="noreferrer">{f.name}</a>
                  <span className="shrink-0 font-mono text-xs text-faint">{f.extension.toUpperCase()} · {bytes(f.size)}</span>
                </li>
              )) : <li className="px-5 py-4 text-sm text-mute">Aucun fichier.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
