"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/admin/shell";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Card, CardHeader, ErrorState, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, download } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";
import type { Order, Paginated, Product, Quote, QuoteItem } from "@/lib/types";

const EMPTY_ITEM: QuoteItem = { description: "", quantity: 1, unit_price: 0, unit_cost: null, discount: 0 };

export default function QuoteEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "nouveau";
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useAuth();

  const { data, isPending, error, refetch } = useApi<{ data: Quote }>(isNew ? null : `/admin/quotes/${id}`);
  const products = useApi<Paginated<Product>>("/admin/products", { per_page: 100, "filter[status]": "published", sort: "name" }, { staleTime: 300_000 });
  const [clientSearch, setClientSearch] = useState("");
  const clients = useApi<Paginated<{ id: number; display_name: string; email?: string }>>("/admin/clients", { search: clientSearch || undefined, per_page: 20 });

  const [form, setForm] = useState({ client_id: params.get("client") ?? "", project_id: "", issued_at: "", valid_until: "", discount_amount: 0, tax_rate: 0, notes: "", terms: "" });
  const [items, setItems] = useState<QuoteItem[]>([{ ...EMPTY_ITEM }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const quote = data?.data;
  useEffect(() => {
    if (!quote) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
    setForm({
      client_id: String(quote.client_id ?? ""), project_id: String(quote.project_id ?? ""), issued_at: quote.issued_at ?? "", valid_until: quote.valid_until ?? "",
      discount_amount: quote.discount_amount, tax_rate: quote.tax_rate, notes: quote.notes ?? "", terms: quote.terms ?? "",
    });
    setItems(quote.items?.length ? quote.items : [{ ...EMPTY_ITEM }]);
  }, [quote]);

  const editable = isNew || (quote && ["draft", "sent"].includes(quote.status) && can("quotes.update"));

  // Aperçu des totaux (indicatif : le serveur recalcule à l'enregistrement)
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + Math.max(0, i.quantity * i.unit_price - (i.discount ?? 0)), 0);
    const discount = Math.min(subtotal, form.discount_amount || 0);
    const tax = Math.round(((subtotal - discount) * (form.tax_rate || 0)) / 100);
    const cost = items.every((i) => i.unit_cost !== null && i.unit_cost !== undefined) ? items.reduce((s, i) => s + (i.unit_cost ?? 0) * i.quantity, 0) : null;
    return { subtotal, discount, tax, total: subtotal - discount + tax, margin: cost !== null ? subtotal - discount - cost : null };
  }, [items, form.discount_amount, form.tax_rate]);

  const setItem = (i: number, patch: Partial<QuoteItem>) => setItems((all) => all.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const body = {
        ...form,
        client_id: Number(form.client_id) || null,
        project_id: Number(form.project_id) || null,
        issued_at: form.issued_at || null,
        valid_until: form.valid_until || null,
        items: items.map((i) => ({ ...i, product_id: i.product_id || null, unit_cost: i.unit_cost ?? null })),
      };
      const res = await api<{ data: Quote }>(isNew ? "/admin/quotes" : `/admin/quotes/${id}`, { method: isNew ? "POST" : "PUT", body });
      toast.success(isNew ? "Devis créé" : "Devis enregistré");
      if (isNew) router.replace(`/admin/devis/${res.data.id}`);
      else refetch();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
        toast.error("Enregistrement impossible", e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const send = useAction(() => api(`/admin/quotes/${id}/send`, { method: "POST" }), { success: "Devis envoyé au client", invalidate: ["/admin/quotes"] });
  const accept = useAction(() => api<{ data: Order }>(`/admin/quotes/${id}/accept`, { method: "POST" }), { success: (r) => `Commande ${r.data.number} créée`, invalidate: ["/admin"] });
  const reject = useAction(() => api(`/admin/quotes/${id}/reject`, { method: "POST", body: { reason } }), { success: "Devis marqué comme refusé", invalidate: ["/admin/quotes"] });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!isNew && (isPending || !quote)) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <>
      <Link href="/admin/devis" className="font-mono text-xs tracking-widest text-faint hover:text-ink">← DEVIS</Link>
      <PageTitle
        title={isNew ? "Nouveau devis" : `Devis ${quote!.number}`}
        description={quote?.project ? `Demande ${quote.project.number}` : undefined}
        actions={
          <>
            {quote && <StatusBadge status={quote.status} label={quote.status_label} />}
            {quote && <Button variant="secondary" size="sm" onClick={() => download(`/admin/quotes/${id}/pdf`, undefined, `${quote.number}.pdf`)}>PDF</Button>}
            {quote && ["draft", "sent"].includes(quote.status) && can("quotes.update") && <Button variant="secondary" size="sm" loading={send.isPending} onClick={() => send.mutate(undefined, { onSuccess: () => refetch() })}>{quote.status === "sent" ? "Renvoyer" : "Envoyer au client"}</Button>}
            {quote?.status === "sent" && can("orders.create") && <Button size="sm" loading={accept.isPending} onClick={() => accept.mutate(undefined, { onSuccess: (r) => router.push(`/admin/commandes/${r.data.id}`) })}>Accord client → commande</Button>}
            {quote?.status === "sent" && can("quotes.update") && <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>Refusé</Button>}
            {quote?.order && <Link href={`/admin/commandes/${quote.order.id}`} className="self-center text-sm text-accent-strong">Commande {quote.order.number} →</Link>}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Client & dates" />
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Client" required error={errors.client_id}>
                {(p) => (
                  <div className="flex flex-col gap-2">
                    {editable && isNew && <Input placeholder="Rechercher un client…" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} aria-label="Rechercher un client" className="h-10" />}
                    <Select {...p} value={form.client_id} disabled={!editable} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                      <option value="">Choisir…</option>
                      {quote?.client && <option value={quote.client.id}>{quote.client.display_name}</option>}
                      {clients.data?.data.filter((c) => c.id !== quote?.client?.id).map((c) => <option key={c.id} value={c.id}>{c.display_name}{c.email ? ` — ${c.email}` : ""}</option>)}
                    </Select>
                  </div>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Émis le">{(p) => <DatePicker {...p} disabled={!editable} value={form.issued_at} onChange={(e) => setForm({ ...form, issued_at: e.target.value })} />}</Field>
                <Field label="Valable jusqu'au" error={errors.valid_until}>{(p) => <DatePicker {...p} disabled={!editable} value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />}</Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Lignes" description="Le coût de revient (interne) sert au calcul de la marge prévisionnelle" />
            <div className="flex flex-col divide-y divide-line">
              {items.map((it, i) => (
                <div key={i} className="grid gap-3 p-5 md:grid-cols-[1.4fr_5rem_8rem_8rem_7rem_auto]">
                  <div className="flex flex-col gap-2">
                    <Select aria-label="Produit du catalogue" disabled={!editable} value={it.product_id ?? ""} className="h-10" onChange={(e) => {
                      const pr = products.data?.data.find((x) => x.id === Number(e.target.value));
                      setItem(i, { product_id: pr?.id ?? null, description: pr ? `${pr.name} (${pr.reference})` : it.description, unit_price: pr?.base_price ?? it.unit_price });
                    }}>
                      <option value="">Ligne libre</option>
                      {products.data?.data.map((pr) => <option key={pr.id} value={pr.id}>{pr.name} — {pr.reference}</option>)}
                    </Select>
                    <Input aria-label="Désignation" placeholder="Désignation" disabled={!editable} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} className="h-10" aria-invalid={!!errors[`items.${i}.description`]} />
                  </div>
                  <Input aria-label="Quantité" type="number" min={1} disabled={!editable} value={it.quantity} onChange={(e) => setItem(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="h-10" />
                  <Input aria-label="Prix unitaire" type="number" min={0} disabled={!editable} value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) || 0 })} className="h-10" />
                  <Input aria-label="Coût unitaire (interne)" placeholder="Coût" type="number" min={0} disabled={!editable} value={it.unit_cost ?? ""} onChange={(e) => setItem(i, { unit_cost: e.target.value === "" ? null : Number(e.target.value) })} className="h-10" />
                  <Input aria-label="Remise ligne" placeholder="Remise" type="number" min={0} disabled={!editable} value={it.discount ?? 0} onChange={(e) => setItem(i, { discount: Number(e.target.value) || 0 })} className="h-10" />
                  <div className="flex items-center justify-between gap-2 md:flex-col md:items-end md:justify-center">
                    <span className="font-mono text-sm text-ink">{fcfa(Math.max(0, it.quantity * it.unit_price - (it.discount ?? 0)))}</span>
                    {editable && items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, k) => k !== i))} className="text-xs text-danger">Retirer</button>}
                  </div>
                </div>
              ))}
            </div>
            {editable && <div className="border-t border-line p-4"><Button size="sm" variant="secondary" onClick={() => setItems([...items, { ...EMPTY_ITEM }])}>+ Ajouter une ligne</Button></div>}
            {errors.items && <p className="px-5 pb-4 text-sm text-danger">{errors.items}</p>}
          </Card>

          <Card>
            <CardHeader title="Conditions" />
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Notes (visibles par le client)">{(p) => <Textarea {...p} disabled={!editable} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />}</Field>
              <Field label="Conditions">{(p) => <Textarea {...p} disabled={!editable} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={4} placeholder="Acompte de 50 % à la validation…" />}</Field>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <Card className="p-5">
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><dt className="text-mute">Sous-total</dt><dd className="font-mono">{fcfa(totals.subtotal)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-mute">Remise globale</dt><dd><Input type="number" min={0} aria-label="Remise globale" disabled={!editable} value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) || 0 })} className="h-9 w-32 text-right" /></dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-mute">TVA (%)</dt><dd><Input type="number" min={0} max={50} step={0.5} aria-label="Taux de TVA" disabled={!editable} value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) || 0 })} className="h-9 w-32 text-right" /></dd></div>
              <div className="flex justify-between"><dt className="text-mute">TVA</dt><dd className="font-mono">{fcfa(totals.tax)}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd className="font-mono">{fcfa(totals.total)}</dd></div>
              <div className="flex justify-between text-xs"><dt className="text-faint">Marge prévisionnelle</dt><dd className="font-mono text-faint">{totals.margin !== null ? fcfa(totals.margin) : "coûts incomplets"}</dd></div>
            </dl>
            {editable && <Button className="mt-5 w-full" loading={saving} onClick={save}>{isNew ? "Créer le devis" : "Enregistrer"}</Button>}
            {!editable && quote && <p className="mt-4 text-xs text-faint">Ce devis n&apos;est plus modifiable ({quote.status_label.toLowerCase()}).</p>}
          </Card>
        </aside>
      </div>

      <Modal open={rejecting} onClose={() => setRejecting(false)} title="Marquer le devis comme refusé" footer={<><Button variant="ghost" onClick={() => setRejecting(false)}>Annuler</Button><Button variant="danger" loading={reject.isPending} onClick={() => reject.mutate(undefined, { onSuccess: () => (setRejecting(false), refetch()) })}>Confirmer</Button></>}>
        <Field label="Motif">{(p) => <Input {...p} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} />}</Field>
      </Modal>
    </>
  );
}
