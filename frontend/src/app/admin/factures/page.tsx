"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PAYMENT_METHODS } from "@/components/admin/lookups";
import { PageTitle } from "@/components/admin/shell";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker, Field, Input, Select } from "@/components/ui/field";
import { Drawer } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/primitives";
import { api, download } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, date, fcfa } from "@/lib/format";
import { useAction, useApi, useTable } from "@/lib/hooks";
import type { Invoice } from "@/lib/types";

export default function InvoicesPage() {
  const params = useSearchParams();
  const { can } = useAuth();
  const [status, setStatus] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [openId, setOpenId] = useState<number | null>(params.get("open") ? Number(params.get("open")) : null);
  const { state, setState, query } = useTable<Invoice>("/admin/invoices", "-issued_at", { "filter[status]": status || undefined, overdue: overdue || undefined });
  const detail = useApi<{ data: Invoice }>(openId ? `/admin/invoices/${openId}` : null);
  const today = new Date().toLocaleDateString("sv-SE");
  const [pay, setPay] = useState({ amount: "", method: "mobile_money", paid_at: today, reference: "" });
  const inv = detail.data?.data;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
    if (inv) setPay((p) => ({ ...p, amount: String(inv.balance) }));
  }, [inv]);

  const record = useAction(() => api(`/admin/invoices/${openId}/payments`, { method: "POST", body: { ...pay, amount: Number(pay.amount) } }), { success: "Paiement enregistré", invalidate: ["/admin/invoices", "/admin/orders", "/admin/dashboard"] });
  const issue = useAction(() => api(`/admin/invoices/${openId}/issue`, { method: "POST" }), { success: "Facture émise", invalidate: ["/admin/invoices"] });
  const cancel = useAction(() => api(`/admin/invoices/${openId}/cancel`, { method: "POST" }), { success: "Facture annulée", invalidate: ["/admin/invoices"] });

  return (
    <>
      <PageTitle title="Factures" description={`Restant à encaisser : ${fcfa(Number(query.data?.meta.outstanding ?? 0))}`} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={status} onChange={setStatus} tabs={[{ value: "", label: "Toutes" }, { value: "issued,partially_paid", label: "À encaisser" }, { value: "paid", label: "Payées" }, { value: "draft", label: "Brouillons" }, { value: "cancelled", label: "Annulées" }]} />
        <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} className="accent-[var(--accent)]" />Échues</label>
      </div>
      <DataTable<Invoice>
        columns={[
          { key: "number", header: "N°", sort: "number", cell: (i) => <span className="font-mono text-accent-strong">{i.number}</span> },
          { key: "client", header: "Client", cell: (i) => i.client?.display_name },
          { key: "order", header: "Commande", cell: (i) => <span className="font-mono text-xs text-mute">{i.order?.number ?? "—"}</span>, desktopOnly: true },
          { key: "issued_at", header: "Émise", sort: "issued_at", cell: (i) => date(i.issued_at), desktopOnly: true },
          { key: "due_at", header: "Échéance", sort: "due_at", cell: (i) => <span className={cn(i.is_overdue && "font-medium text-danger")}>{date(i.due_at)}</span> },
          { key: "total", header: "Total", sort: "total", align: "right", cell: (i) => fcfa(i.total) },
          { key: "balance", header: "Reste dû", align: "right", cell: (i) => (i.balance > 0 ? fcfa(i.balance) : "—") },
          { key: "status", header: "Statut", cell: (i) => <StatusBadge status={i.is_overdue ? "unpaid" : i.status} label={i.is_overdue ? "Échue" : i.status_label} /> },
        ]}
        rows={query.data?.data} meta={query.data?.meta} loading={query.isPending} error={query.error} onRetry={() => query.refetch()}
        state={state} onStateChange={setState} rowKey={(i) => i.id} onRowClick={(i) => setOpenId(i.id)} searchPlaceholder="N° de facture…" storageKey="invoices"
      />

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={inv ? `Facture ${inv.number}` : "Facture"} description={inv ? `${inv.client?.display_name} · émise le ${date(inv.issued_at)}` : undefined}>
        {inv && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={inv.status} label={inv.status_label} />
              <Button size="sm" variant="secondary" onClick={() => download(`/admin/invoices/${inv.id}/pdf`, undefined, `${inv.number}.pdf`)}>PDF</Button>
              {inv.status === "draft" && can("invoices.update") && <Button size="sm" loading={issue.isPending} onClick={() => issue.mutate(undefined, { onSuccess: () => detail.refetch() })}>Émettre</Button>}
              {inv.amount_paid === 0 && inv.status !== "cancelled" && can("invoices.update") && <Button size="sm" variant="ghost" className="text-danger" onClick={() => cancel.mutate(undefined, { onSuccess: () => detail.refetch() })}>Annuler</Button>}
            </div>
            <dl className="grid grid-cols-3 gap-4 rounded-xl border border-line p-4 text-sm">
              <div><dt className="text-faint">Total</dt><dd className="font-mono text-ink">{fcfa(inv.total)}</dd></div>
              <div><dt className="text-faint">Réglé</dt><dd className="font-mono text-success">{fcfa(inv.amount_paid)}</dd></div>
              <div><dt className="text-faint">Reste</dt><dd className="font-mono text-ink">{fcfa(inv.balance)}</dd></div>
            </dl>
            <div>
              <p className="mb-2 text-sm font-medium">Paiements</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {inv.payments?.length ? inv.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 px-4 py-2 text-sm"><span>{date(p.paid_at)} · {p.method_label}{p.reference ? ` · ${p.reference}` : ""}</span><span className="font-mono">{fcfa(p.amount)}</span></li>
                )) : <li className="px-4 py-4 text-center text-sm text-mute">Aucun paiement.</li>}
              </ul>
            </div>
            {inv.balance > 0 && ["issued", "partially_paid"].includes(inv.status) && can("invoices.update") && (
              <form className="grid gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4" onSubmit={(e) => (e.preventDefault(), record.mutate(undefined, { onSuccess: () => detail.refetch() }))}>
                <p className="text-sm font-medium">Enregistrer un paiement</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Montant">{(p) => <Input {...p} type="number" min={1} max={inv.balance} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />}</Field>
                  <Field label="Date">{(p) => <DatePicker {...p} max={today} value={pay.paid_at} onChange={(e) => setPay({ ...pay, paid_at: e.target.value })} />}</Field>
                  <Field label="Moyen">{(p) => <Select {...p} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select>}</Field>
                  <Field label="Référence">{(p) => <Input {...p} value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} placeholder="ID transaction…" />}</Field>
                </div>
                <Button type="submit" loading={record.isPending}>Enregistrer le paiement</Button>
              </form>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
