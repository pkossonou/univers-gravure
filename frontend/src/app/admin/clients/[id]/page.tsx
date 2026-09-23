"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CLIENT_TYPES } from "@/components/admin/lookups";
import { PageTitle } from "@/components/admin/shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, ErrorState, Skeleton, StatCard } from "@/components/ui/primitives";
import { date, dateTime, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface ClientFile {
  data: Record<string, string | null> & { id: number; display_name: string; deleted_at?: string | null; user?: { email: string; last_login_at?: string } | null };
  projects: { id: number; number: string; project_type: string; status: string; status_label: string; quantity: number; estimate_min?: number; created_at: string }[];
  quotes: { id: number; number: string; status: string; status_label: string; total: number; issued_at?: string }[];
  orders: { id: number; number: string; status: string; status_label: string; payment_status: string; total: number; ordered_at: string }[];
  stats: null | { revenue_total: number; paid_total: number; balance_due: number; orders_count: number; first_order_at?: string };
  history: { action: string; description?: string; created_at: string }[];
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error, refetch } = useApi<ClientFile>(`/admin/clients/${id}`);
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending || !data) return <Skeleton className="h-96 rounded-2xl" />;
  const c = data.data;

  return (
    <>
      <Link href="/admin/clients" className="font-mono text-xs tracking-widest text-faint hover:text-ink">← CLIENTS</Link>
      <PageTitle
        title={c.display_name}
        description={[CLIENT_TYPES.find((t) => t.value === c.type)?.label, c.city, c.email, c.phone].filter(Boolean).join(" · ")}
        actions={<ButtonLink href={`/admin/devis/nouveau?client=${c.id}`} size="sm">Nouveau devis</ButtonLink>}
      />
      {c.deleted_at && <Badge tone="warning" className="mb-4">Client archivé le {date(c.deleted_at)}</Badge>}
      {data.stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="CA total" value={fcfa(data.stats.revenue_total)} />
          <StatCard label="Encaissé" value={fcfa(data.stats.paid_total)} />
          <StatCard label="Solde dû" value={fcfa(data.stats.balance_due)} tone={data.stats.balance_due > 0 ? "warning" : "default"} />
          <StatCard label="Commandes" value={data.stats.orders_count} hint={data.stats.first_order_at ? `client depuis ${date(data.stats.first_order_at)}` : undefined} />
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Commandes" />
          <ul className="divide-y divide-line">
            {data.orders.length ? data.orders.map((o) => (
              <li key={o.id}><Link href={`/admin/commandes/${o.id}`} className="grid grid-cols-[8rem_1fr_auto_auto] items-center gap-4 px-5 py-3 text-sm hover:bg-raised">
                <span className="font-mono text-ink">{o.number}</span><span className="text-mute">{date(o.ordered_at)}</span><span className="font-mono text-ink">{fcfa(o.total)}</span><StatusBadge status={o.status} label={o.status_label} />
              </Link></li>
            )) : <li className="px-5 py-6 text-center text-sm text-mute">Aucune commande.</li>}
          </ul>
          <CardHeader title="Devis" className="border-t" />
          <ul className="divide-y divide-line">
            {data.quotes.length ? data.quotes.map((q) => (
              <li key={q.id}><Link href={`/admin/devis/${q.id}`} className="grid grid-cols-[8rem_1fr_auto_auto] items-center gap-4 px-5 py-3 text-sm hover:bg-raised">
                <span className="font-mono text-ink">{q.number}</span><span className="text-mute">{date(q.issued_at)}</span><span className="font-mono text-ink">{fcfa(q.total)}</span><StatusBadge status={q.status} label={q.status_label} />
              </Link></li>
            )) : <li className="px-5 py-6 text-center text-sm text-mute">Aucun devis.</li>}
          </ul>
          <CardHeader title="Demandes" className="border-t" />
          <ul className="divide-y divide-line">
            {data.projects.map((p) => (
              <li key={p.id}><Link href={`/admin/demandes/${p.id}`} className="grid grid-cols-[8rem_1fr_auto] items-center gap-4 px-5 py-3 text-sm hover:bg-raised">
                <span className="font-mono text-ink">{p.number}</span><span className="text-mute">{p.project_type} · {p.quantity} ex. · {date(p.created_at)}</span><StatusBadge status={p.status} label={p.status_label} />
              </Link></li>
            ))}
          </ul>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Coordonnées" />
            <dl className="grid gap-3 p-5 text-sm">
              {[["E-mail", c.email], ["Téléphone", c.phone], ["Adresse", [c.address, c.city, c.country].filter(Boolean).join(", ")], ["Source", c.source], ["Compte client", c.user ? `Actif — dernière connexion ${dateTime(c.user.last_login_at)}` : "Pas de compte"]].map(([k, v]) => (
                <div key={String(k)}><dt className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">{k}</dt><dd className="text-ink">{v || "—"}</dd></div>
              ))}
            </dl>
            {c.notes && <p className="border-t border-line p-5 text-sm whitespace-pre-line text-mute">{c.notes}</p>}
          </Card>
          <Card>
            <CardHeader title="Historique" />
            <ul className="divide-y divide-line">
              {data.history.length ? data.history.map((h, i) => (
                <li key={i} className="px-5 py-3 text-sm"><p className="text-ink">{h.description ?? h.action}</p><p className="font-mono text-xs text-faint">{dateTime(h.created_at)}</p></li>
              )) : <li className="px-5 py-6 text-center text-sm text-mute">Aucun événement.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
