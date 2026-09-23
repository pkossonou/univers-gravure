"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { opts, useLookups } from "@/components/admin/lookups";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker, Field, Input, Select } from "@/components/ui/field";
import { Drawer } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date, fcfa } from "@/lib/format";
import { useAction, useApi, useTable } from "@/lib/hooks";
import type { Paginated } from "@/lib/types";

interface Supplier extends Record<string, unknown> { id: number; name: string; category?: string; phone?: string; email?: string; city?: string; purchases_count: number; contacts: { name: string; phone?: string }[] }
interface Purchase { id: number; number: string; purchase_date: string; status: string; total: number; supplier: { name: string }; items_count: number }

export default function SuppliersPage() {
  const [tab, setTab] = useState<"suppliers" | "purchases">("suppliers");
  return (
    <>
      <PageTitle title="Fournisseurs & achats" description="Réceptionner un achat met à jour le stock et crée la dépense correspondante." />
      <Tabs className="mb-6 w-fit" value={tab} onChange={setTab} tabs={[{ value: "suppliers", label: "Fournisseurs" }, { value: "purchases", label: "Achats" }]} />
      {tab === "suppliers" ? (
        <ResourceManager<Supplier>
          endpoint="/admin/suppliers" permission="suppliers" title="Fournisseurs" singular="Fournisseur" initialSort="name" deleteLabel="Archiver"
          toForm={(r) => ({ ...r, contact_name: r.contacts?.[0]?.name ?? "", contact_phone: r.contacts?.[0]?.phone ?? "" })}
          toPayload={(v) => {
            const { contact_name, contact_phone } = v as Record<string, unknown>;
            const keep = ["name", "email", "phone", "address", "city", "country", "category", "tax_number", "notes", "is_active"];
            const rest = Object.fromEntries(Object.entries(v).filter(([k]) => keep.includes(k)));
            return { ...rest, contacts: contact_name ? [{ name: contact_name, phone: contact_phone || null }] : [] };
          }}
          columns={[
            { key: "name", header: "Fournisseur", sort: "name", cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "category", header: "Catégorie", cell: (r) => r.category ?? "—" },
            { key: "contact", header: "Contact", cell: (r) => <span className="text-mute">{r.contacts?.[0]?.name ?? r.phone ?? r.email ?? "—"}</span>, desktopOnly: true },
            { key: "city", header: "Ville", sort: "city", cell: (r) => r.city ?? "—", desktopOnly: true },
            { key: "purchases_count", header: "Achats", align: "right", cell: (r) => r.purchases_count },
          ]}
          defaults={{ is_active: true, country: "Côte d'Ivoire" }}
          fields={[
            { name: "name", label: "Raison sociale", required: true }, { name: "category", label: "Catégorie", span: 1 }, { name: "tax_number", label: "N° contribuable", span: 1 },
            { name: "email", label: "E-mail", type: "email", span: 1 }, { name: "phone", label: "Téléphone", type: "tel", span: 1 },
            { name: "address", label: "Adresse" }, { name: "city", label: "Ville", span: 1 }, { name: "country", label: "Pays", span: 1 },
            { name: "contact_name", label: "Contact principal", span: 1 }, { name: "contact_phone", label: "Téléphone du contact", span: 1 },
            { name: "notes", label: "Notes", type: "textarea" }, { name: "is_active", label: "Actif", type: "checkbox" },
          ]}
        />
      ) : <Purchases />}
    </>
  );
}

function Purchases() {
  const { can } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const lookups = useLookups();
  const stock = useApi<Paginated<{ id: number; name: string; sku: string; unit_cost: number }>>("/admin/stock-items", { per_page: 100, sort: "name" });
  const { state, setState, query } = useTable<Purchase>("/admin/purchases", "-purchase_date");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", purchase_date: new Date().toISOString().slice(0, 10), items: [{ stock_item_id: "", description: "", quantity: "1", unit_price: "0" }] });
  const receive = useAction((id: number) => api(`/admin/purchases/${id}/receive`, { method: "POST" }), { success: "Achat réceptionné : stock et dépenses à jour", invalidate: ["/admin"] });

  const create = async () => {
    try {
      await api("/admin/purchases", { method: "POST", body: { ...form, supplier_id: Number(form.supplier_id), items: form.items.map((i) => ({ ...i, stock_item_id: i.stock_item_id ? Number(i.stock_item_id) : null, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })) } });
      toast.success("Achat enregistré");
      setOpen(false);
      client.invalidateQueries({ queryKey: ["/admin/purchases"] });
    } catch (e) {
      toast.error("Achat invalide", e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : undefined);
    }
  };

  return (
    <>
      {can("suppliers.create") && <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}>Nouvel achat</Button></div>}
      <DataTable<Purchase>
        columns={[
          { key: "number", header: "N°", cell: (p) => <span className="font-mono">{p.number}</span> },
          { key: "supplier", header: "Fournisseur", cell: (p) => p.supplier.name },
          { key: "date", header: "Date", sort: "purchase_date", cell: (p) => date(p.purchase_date) },
          { key: "total", header: "Montant", sort: "total", align: "right", cell: (p) => fcfa(p.total) },
          { key: "status", header: "Statut", cell: (p) => <StatusBadge status={p.status === "received" ? "done" : p.status === "ordered" ? "pending" : "cancelled"} label={p.status === "received" ? "Réceptionné" : p.status === "ordered" ? "Commandé" : "Annulé"} /> },
          { key: "act", header: "", align: "right", cell: (p) => p.status === "ordered" && can("stock.update") ? <Button size="sm" variant="secondary" loading={receive.isPending && receive.variables === p.id} onClick={() => receive.mutate(p.id)}>Réceptionner</Button> : null },
        ]}
        rows={query.data?.data} meta={query.data?.meta} loading={query.isPending} error={query.error} onRetry={() => query.refetch()}
        state={state} onStateChange={setState} rowKey={(p) => p.id} searchPlaceholder="N° d'achat…"
      />
      <Drawer open={open} onClose={() => setOpen(false)} title="Nouvel achat fournisseur" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={create}>Enregistrer</Button></>}>
        <div className="grid gap-4">
          <Field label="Fournisseur" required>{(p) => <Select {...p} value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}><option value="">—</option>{opts(lookups?.suppliers).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>}</Field>
          <Field label="Date">{(p) => <DatePicker {...p} value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />}</Field>
          {form.items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line p-3">
              <Select aria-label="Article de stock" value={it.stock_item_id} className="h-10" onChange={(e) => {
                const s = stock.data?.data.find((x) => x.id === Number(e.target.value));
                setForm({ ...form, items: form.items.map((x, k) => (k === i ? { ...x, stock_item_id: e.target.value, description: s?.name ?? x.description, unit_price: String(s?.unit_cost ?? x.unit_price) } : x)) });
              }}>
                <option value="">Hors stock</option>
                {stock.data?.data.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)}
              </Select>
              <Input aria-label="Désignation" placeholder="Désignation" value={it.description} className="h-10" onChange={(e) => setForm({ ...form, items: form.items.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)) })} />
              <div className="grid grid-cols-2 gap-2">
                <Input aria-label="Quantité" type="number" step="any" value={it.quantity} className="h-10" onChange={(e) => setForm({ ...form, items: form.items.map((x, k) => (k === i ? { ...x, quantity: e.target.value } : x)) })} />
                <Input aria-label="Prix unitaire" type="number" value={it.unit_price} className="h-10" onChange={(e) => setForm({ ...form, items: form.items.map((x, k) => (k === i ? { ...x, unit_price: e.target.value } : x)) })} />
              </div>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setForm({ ...form, items: [...form.items, { stock_item_id: "", description: "", quantity: "1", unit_price: "0" }] })}>+ Ligne</Button>
          <p className="text-right font-mono text-sm">Total : {fcfa(form.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))}</p>
        </div>
      </Drawer>
    </>
  );
}
