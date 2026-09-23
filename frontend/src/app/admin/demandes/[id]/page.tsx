"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { labelOpts, opts, useLookups } from "@/components/admin/lookups";
import { PageTitle } from "@/components/admin/shell";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Card, CardHeader, ErrorState, Skeleton, Timeline } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PROJECT_CHANNELS, whatsappLink } from "@/lib/site";
import { bytes, date, dateTime, fcfa } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";
import type { Project, Quote } from "@/lib/types";

export default function ProjectAdminDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const lookups = useLookups();
  const { data, isPending, error, refetch } = useApi<{ data: Project }>(`/admin/projects/${id}`);
  const update = useAction((body: Record<string, unknown>) => api(`/admin/projects/${id}`, { method: "PUT", body }), { success: "Demande mise à jour", invalidate: ["/admin/projects"] });
  const draft = useAction(() => api<{ data: Quote }>(`/admin/projects/${id}/draft-quote`, { method: "POST" }), { success: "Brouillon de devis créé", invalidate: ["/admin/projects", "/admin/quotes"] });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending || !data) return <Skeleton className="h-96 rounded-2xl" />;
  const p = data.data;
  const perso = (p.personalization ?? {}) as Record<string, unknown>;
  const config = (p.configuration ?? {}) as Record<string, unknown>;

  return (
    <>
      <Link href="/admin/demandes" className="font-mono text-xs tracking-widest text-faint hover:text-ink">← DEMANDES</Link>
      <PageTitle
        title={`${p.number} — ${p.project_type_label}`}
        description={`Reçue le ${dateTime(p.created_at)} via ${PROJECT_CHANNELS[p.channel] ?? p.channel}`}
        actions={
          <>
            <StatusBadge status={p.status} label={p.status_label} />
            {can("quotes.create") && !p.order && (
              <Button size="sm" loading={draft.isPending} onClick={() => draft.mutate(undefined, { onSuccess: (r) => router.push(`/admin/devis/${r.data.id}`) })}>
                Préparer le devis
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {p.timeline && <Card className="p-5"><Timeline stages={p.timeline.stages} /></Card>}
          <Card>
            <CardHeader title="Projet" />
            <dl className="grid gap-4 p-5 text-sm sm:grid-cols-3">
              {[
                ["Produit", p.product ? `${p.product.name} (${p.product.reference})` : "Sur mesure"],
                ["Quantité", p.quantity],
                ["Dimensions", p.dimensions.width_mm ? `${p.dimensions.width_mm} × ${p.dimensions.height_mm} mm` : "—"],
                ["Matériau", p.material?.name ?? "—"],
                ["Finition", p.finish?.name ?? "—"],
                ["Urgence", p.urgency],
                ["Date souhaitée", date(p.desired_date)],
                ["Estimation", p.estimate.min ? `${fcfa(p.estimate.min)}${p.estimate.max && p.estimate.max !== p.estimate.min ? ` – ${fcfa(p.estimate.max)}` : ""}` : "Sur étude"],
                ["Confiance", p.estimate.confidence === "firm" ? "Tarif catalogue" : p.estimate.confidence === "from" ? "À partir de" : "Validation requise"],
              ].map(([k, v]) => (
                <div key={String(k)}><dt className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">{k}</dt><dd className="mt-0.5 text-ink">{v}</dd></div>
              ))}
            </dl>
            {p.description && <p className="border-t border-line p-5 text-sm whitespace-pre-line text-mute">{p.description}</p>}
          </Card>
          <Card>
            <CardHeader title="Personnalisation & configuration" />
            <div className="grid gap-4 p-5 text-sm sm:grid-cols-2">
              <pre className="overflow-auto rounded-xl bg-raised p-4 font-mono text-xs whitespace-pre-wrap text-ink">{Object.keys(perso).length ? Object.entries(perso).map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(", ") : String(v)}`).join("\n") : "Aucune"}</pre>
              <pre className="overflow-auto rounded-xl bg-raised p-4 font-mono text-xs whitespace-pre-wrap text-ink">{Object.keys(config).length ? Object.entries(config).map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(", ") : v === null ? "—" : String(v)}`).join("\n") : "—"}</pre>
            </div>
          </Card>
          <Card>
            <CardHeader title={`Fichiers (${p.files?.length ?? 0})`} description="Liens sécurisés valables 30 minutes" />
            <ul className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {p.files?.map((f) => (
                <li key={f.id}>
                  <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-accent">
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-raised font-mono text-[0.65rem] text-mute">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {f.preview_url ? <img src={f.preview_url} alt="" className="size-full object-cover" /> : f.extension.toUpperCase()}
                    </span>
                    <span className="min-w-0"><span className="block truncate text-sm text-ink">{f.name}</span><span className="font-mono text-xs text-faint">{f.kind} · {bytes(f.size)}</span></span>
                  </a>
                </li>
              ))}
              {!p.files?.length && <li className="text-sm text-mute">Aucun fichier joint.</li>}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Client" />
            <div className="p-5 text-sm">
              <p className="font-medium text-ink">{p.contact_name}</p>
              {p.company && <p className="text-mute">{p.company}</p>}
              {p.contact_phone && <a href={`tel:${p.contact_phone}`} className="block text-accent-strong">{p.contact_phone}</a>}
              {p.contact_email && <a href={`mailto:${p.contact_email}`} className="block text-accent-strong">{p.contact_email}</a>}
              {whatsappLink(p.contact_phone) && (
                <a
                  href={whatsappLink(p.contact_phone, `Bonjour ${p.contact_name}, ici UNIVERS GRAVURE au sujet de votre demande ${p.number}. `)!}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-ink"
                >
                  Répondre sur WhatsApp
                </a>
              )}
              {p.client && <Link href={`/admin/clients/${p.client.id}`} className="mt-3 inline-block text-sm text-ink underline underline-offset-4">Fiche client →</Link>}
            </div>
          </Card>
          {can("projects.update") && (
            <Card>
              <CardHeader title="Traitement" />
              <div className="grid gap-4 p-5">
                <label className="grid gap-1.5 text-sm">
                  <span className="text-ink">Statut</span>
                  <Select value={p.status} onChange={(e) => update.mutate({ status: e.target.value })}>
                    {labelOpts(lookups?.labels.project_statuses).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="text-ink">Commercial en charge</span>
                  <Select value={p.assigned_to ?? ""} onChange={(e) => update.mutate({ assigned_to: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Non assignée</option>
                    {opts(lookups?.staff).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </label>
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="Devis liés" />
            <ul className="divide-y divide-line">
              {p.quotes?.length ? p.quotes.map((q) => (
                <li key={q.id}><Link href={`/admin/devis/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-raised"><span className="font-mono">{q.number}</span><span>{fcfa(q.total)}</span><StatusBadge status={q.status} label={q.status_label} /></Link></li>
              )) : <li className="px-5 py-4 text-sm text-mute">Aucun devis.</li>}
              {p.order && <li><Link href={`/admin/commandes/${p.order.id}`} className="block px-5 py-3 text-sm text-accent-strong">Commande {p.order.number} →</Link></li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
