"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { labelOpts, useLookups } from "@/components/admin/lookups";
import { PageTitle } from "@/components/admin/shell";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, DatePicker, Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Card, CardHeader, ErrorState, Skeleton, StatCard, Timeline } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, date, dateTime, fcfa } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";
import type { Invoice, Order } from "@/lib/types";

export default function OrderAdminDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const lookups = useLookups();
  const { data, isPending, error, refetch } = useApi<{ data: Order }>(`/admin/orders/${id}`);
  const [statusModal, setStatusModal] = useState(false);
  const [next, setNext] = useState({ status: "", comment: "", is_client_visible: true });

  const changeStatus = useAction(() => api(`/admin/orders/${id}/status`, { method: "POST", body: next }), { success: "Statut mis à jour", invalidate: ["/admin"] });
  const invoice = useAction(() => api<{ data: Invoice; message: string }>(`/admin/orders/${id}/invoice`, { method: "POST" }), { success: (r) => r.message, invalidate: ["/admin"] });
  const updateOrder = useAction((body: Record<string, unknown>) => api(`/admin/orders/${id}`, { method: "PUT", body }), { success: "Commande mise à jour", invalidate: ["/admin/orders"] });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending || !data) return <Skeleton className="h-96 rounded-2xl" />;
  const o = data.data;
  const closed = ["completed", "cancelled"].includes(o.status);

  return (
    <>
      <Link href="/admin/commandes" className="font-mono text-xs tracking-widest text-faint hover:text-ink">← COMMANDES</Link>
      <PageTitle
        title={`Commande ${o.number}`}
        description={`${o.client?.display_name ?? ""} · commandée le ${date(o.ordered_at)}${o.quote ? ` · devis ${o.quote.number}` : ""}`}
        actions={
          <>
            <StatusBadge status={o.status} label={o.status_label} />
            {!closed && can("orders.update") && <Button size="sm" onClick={() => (setNext({ status: o.status, comment: "", is_client_visible: true }), setStatusModal(true))}>Changer le statut</Button>}
            {can("invoices.create") && !o.invoices?.some((i) => i.status !== "cancelled") && o.status !== "cancelled" && <Button size="sm" variant="secondary" loading={invoice.isPending} onClick={() => invoice.mutate(undefined, { onSuccess: () => refetch() })}>Émettre la facture</Button>}
            {can("qr_codes.create") && <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/qr-codes?order=${o.id}`)}>QR code trophée</Button>}
          </>
        }
      />

      {o.margin && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Montant" value={fcfa(o.total)} hint={o.payment_status === "paid" ? "réglée" : o.payment_status === "partial" ? "acompte reçu" : "non réglée"} />
          <StatCard label="Coût estimé" value={fcfa(o.margin.cost_estimate)} />
          <StatCard label="Dépenses imputées" value={fcfa(o.margin.direct_expenses)} />
          <StatCard label="Marge estimée" value={fcfa(o.margin.estimated)} tone={o.margin.estimated < 0 ? "danger" : "default"} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {o.timeline && <Card className="p-5"><Timeline stages={o.timeline.stages} /></Card>}
          <Card>
            <CardHeader title="Articles" />
            <table className="w-full text-sm">
              <tbody>
                {o.items?.map((i) => (
                  <tr key={i.id} className="border-b border-line">
                    <td className="px-5 py-3 text-ink">{i.description}{i.options && <span className="block text-xs text-mute">{Object.entries(i.options).map(([k, v]) => `${k} : ${v}`).join(" · ")}</span>}</td>
                    <td className="px-5 py-3 text-right font-mono">{i.quantity}</td>
                    <td className="px-5 py-3 text-right font-mono">{fcfa(i.unit_price, false)}</td>
                    <td className="px-5 py-3 text-right font-mono text-mute">{i.unit_cost !== null && i.unit_cost !== undefined ? `coût ${fcfa(i.unit_cost, false)}` : ""}</td>
                    <td className="px-5 py-3 text-right font-mono">{fcfa(i.total ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <CardHeader title="Production" action={<Link href="/admin/production" className="text-sm text-accent-strong">Tableau atelier →</Link>} />
            {o.production?.map((po) => (
              <div key={po.id} className="p-5">
                <div className="mb-3 flex items-center justify-between text-sm"><span className="font-mono">{po.number}</span><StatusBadge status={po.status} label={`${po.progress} %`} /></div>
                <ol className="grid gap-2 sm:grid-cols-3">
                  {po.steps.map((s) => (
                    <li key={s.id} className={cn("rounded-xl border px-3 py-2 text-sm", s.status === "done" ? "border-success/40 bg-success/5" : s.status === "in_progress" ? "border-accent bg-accent/5" : "border-line")}>
                      <p className="text-ink">{s.name}</p>
                      <p className="font-mono text-xs text-faint">{s.status === "done" ? `✓ ${date(s.completed_at)}` : s.status === "in_progress" ? "En cours" : "À faire"}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Livraison" />
            <div className="grid gap-4 p-5">
              <Field label="Échéance">{(p) => <DatePicker {...p} defaultValue={o.due_date ?? ""} disabled={!can("orders.update")} onBlur={(e) => e.target.value !== o.due_date && updateOrder.mutate({ due_date: e.target.value || null })} />}</Field>
              <Field label="Mode">
                {(p) => (
                  <Select {...p} defaultValue={o.delivery_method} disabled={!can("orders.update")} onChange={(e) => updateOrder.mutate({ delivery_method: e.target.value })}>
                    <option value="pickup">Retrait à l&apos;atelier</option>
                    <option value="delivery">Livraison</option>
                  </Select>
                )}
              </Field>
              {o.delivery_method === "delivery" && <Field label="Adresse de livraison">{(p) => <Input {...p} defaultValue={o.delivery_address ?? ""} onBlur={(e) => updateOrder.mutate({ delivery_address: e.target.value })} />}</Field>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Factures" />
            <ul className="divide-y divide-line">
              {o.invoices?.length ? o.invoices.map((i) => (
                <li key={i.id}><Link href={`/admin/factures?open=${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-raised"><span className="font-mono">{i.number}</span><span className="font-mono">{fcfa(i.amount_paid)} / {fcfa(i.total)}</span><StatusBadge status={i.status} label={i.status_label} /></Link></li>
              )) : <li className="px-5 py-4 text-sm text-mute">Pas encore de facture.</li>}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Historique" />
            <ul className="divide-y divide-line">
              {o.history?.map((h, i) => (
                <li key={i} className="px-5 py-3 text-sm">
                  <p className="text-ink">{h.label}{h.comment ? ` — ${h.comment}` : ""}</p>
                  <p className="font-mono text-xs text-faint">{dateTime(h.date)}{h.by ? ` · ${h.by}` : ""}</p>
                </li>
              ))}
            </ul>
          </Card>
          {o.qr_codes && o.qr_codes.length > 0 && (
            <Card>
              <CardHeader title="Trophées connectés" />
              <ul className="divide-y divide-line">
                {o.qr_codes.map((q) => <li key={q.id} className="flex justify-between px-5 py-3 text-sm"><span>{q.recipient_name ?? q.title}</span><a href={q.public_url} target="_blank" rel="noreferrer" className="font-mono text-accent-strong">{q.code}</a></li>)}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        title="Changer le statut"
        description="Le client est notifié si le changement lui est visible."
        footer={<><Button variant="ghost" onClick={() => setStatusModal(false)}>Annuler</Button><Button loading={changeStatus.isPending} onClick={() => changeStatus.mutate(undefined, { onSuccess: () => (setStatusModal(false), refetch()) })}>Enregistrer</Button></>}
      >
        <div className="grid gap-4">
          <Field label="Nouveau statut">
            {(p) => <Select {...p} value={next.status} onChange={(e) => setNext({ ...next, status: e.target.value })}>{labelOpts(lookups?.labels.order_statuses).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>}
          </Field>
          <Field label="Commentaire (facultatif)">{(p) => <Input {...p} value={next.comment} onChange={(e) => setNext({ ...next, comment: e.target.value })} maxLength={255} />}</Field>
          <Checkbox label="Visible par le client" checked={next.is_client_visible} onChange={(e) => setNext({ ...next, is_client_visible: e.target.checked })} />
        </div>
      </Modal>
    </>
  );
}
