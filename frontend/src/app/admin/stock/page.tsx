"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { opts, useLookups } from "@/components/admin/lookups";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChoiceChips, Field, Input } from "@/components/ui/field";
import { Drawer } from "@/components/ui/overlay";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, dateTime, fcfa } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";
import type { Paginated } from "@/lib/types";

interface Item extends Record<string, unknown> {
  id: number;
  name: string;
  sku: string;
  type: string;
  unit: string;
  quantity: number;
  alert_threshold: number;
  unit_cost: number;
  location?: string;
  is_low: boolean;
  supplier?: { name: string } | null;
}

const TYPES = [{ value: "raw_material", label: "Matière première" }, { value: "consumable", label: "Consommable" }, { value: "product", label: "Produit" }];
const UNITS = ["pcs", "m", "m2", "kg", "feuille", "litre", "rouleau"].map((u) => ({ value: u, label: u }));

export default function StockPage() {
  const params = useSearchParams();
  const { can } = useAuth();
  const lookups = useLookups();
  const [low, setLow] = useState(params.get("low") === "1");
  const [moving, setMoving] = useState<Item | null>(null);
  const [mv, setMv] = useState({ type: "in", quantity: "", reason: "", unit_cost: "" });
  const summary = useApi<Paginated<Item>>("/admin/stock-items", { per_page: 1 });
  const history = useApi<Paginated<{ id: number; type: string; quantity: number; quantity_after: number; reason?: string; moved_at: string; user?: { name: string } }>>(moving ? `/admin/stock-items/${moving.id}/movements` : null);
  const move = useAction(() => api(`/admin/stock-items/${moving!.id}/movements`, { method: "POST", body: { ...mv, quantity: Number(mv.quantity), unit_cost: mv.unit_cost ? Number(mv.unit_cost) : null } }), { success: "Mouvement enregistré", invalidate: ["/admin/stock-items"] });

  return (
    <>
      <PageTitle title="Stock" description={`Valeur du stock : ${fcfa(Number(summary.data?.meta.stock_value ?? 0))} · ${summary.data?.meta.low_count ?? 0} article(s) sous le seuil d'alerte`} />
      <ResourceManager<Item>
        endpoint="/admin/stock-items" permission="stock" title="Stock" singular="Article" initialSort="name"
        extraQuery={{ low: low || undefined }}
        filters={<label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} className="accent-[var(--accent)]" />Stock faible uniquement</label>}
        rowActions={(r) => can("stock.update") ? <Button size="sm" variant="secondary" onClick={() => (setMoving(r), setMv({ type: "in", quantity: "", reason: "", unit_cost: "" }))}>Mouvement</Button> : null}
        columns={[
          { key: "name", header: "Article", sort: "name", cell: (r) => <span><span className="font-medium">{r.name}</span><span className="block font-mono text-xs text-faint">{r.sku}</span></span> },
          { key: "type", header: "Type", cell: (r) => TYPES.find((t) => t.value === r.type)?.label, desktopOnly: true },
          { key: "quantity", header: "Quantité", sort: "quantity", align: "right", cell: (r) => <span className={cn("font-mono", r.is_low && "font-semibold text-danger")}>{Number(r.quantity).toLocaleString("fr-FR")} {r.unit}</span> },
          { key: "alert", header: "Seuil", align: "right", cell: (r) => `${Number(r.alert_threshold).toLocaleString("fr-FR")}`, desktopOnly: true },
          { key: "unit_cost", header: "Coût unitaire", sort: "unit_cost", align: "right", cell: (r) => fcfa(r.unit_cost), desktopOnly: true },
          { key: "status", header: "État", cell: (r) => (r.is_low ? <Badge tone="danger" dot>Stock faible</Badge> : <Badge tone="success" dot>OK</Badge>) },
          { key: "supplier", header: "Fournisseur", cell: (r) => r.supplier?.name ?? "—", hidden: true },
        ]}
        defaults={{ type: "raw_material", unit: "pcs", is_active: true }}
        fields={[
          { name: "name", label: "Désignation", required: true }, { name: "sku", label: "Référence (SKU)", required: true, span: 1 },
          { name: "type", label: "Type", type: "select", options: TYPES, required: true, span: 1 }, { name: "unit", label: "Unité", type: "select", options: UNITS, required: true, span: 1 },
          { name: "quantity", label: "Quantité initiale", type: "number", createOnly: true, span: 1, hint: "Ensuite, uniquement par mouvements" },
          { name: "alert_threshold", label: "Seuil d'alerte", type: "number", span: 1 }, { name: "unit_cost", label: "Coût unitaire (FCFA)", type: "number", span: 1 },
          { name: "supplier_id", label: "Fournisseur", type: "select", options: opts(lookups?.suppliers), span: 1 }, { name: "material_id", label: "Matériau lié", type: "select", options: opts(lookups?.materials), span: 1 },
          { name: "location", label: "Emplacement" },
        ]}
      />

      <Drawer open={!!moving} onClose={() => setMoving(null)} title={`Mouvement — ${moving?.name ?? ""}`} description={moving ? `Stock actuel : ${moving.quantity} ${moving.unit}` : undefined}
        footer={<><Button variant="ghost" onClick={() => setMoving(null)}>Fermer</Button><Button loading={move.isPending} disabled={!mv.quantity || !mv.reason} onClick={() => move.mutate(undefined, { onSuccess: () => (setMv({ ...mv, quantity: "", reason: "" }), history.refetch(), setMoving(null)) })}>Enregistrer</Button></>}>
        <div className="grid gap-4">
          <ChoiceChips ariaLabel="Type de mouvement" options={[{ value: "in", label: "Entrée" }, { value: "out", label: "Sortie" }, { value: "adjustment", label: "Inventaire (nouvelle quantité)" }]} value={mv.type} onChange={(v) => setMv({ ...mv, type: v as string })} />
          <Field label={mv.type === "adjustment" ? "Quantité constatée" : "Quantité"}>{(p) => <Input {...p} type="number" min={0} step="any" value={mv.quantity} onChange={(e) => setMv({ ...mv, quantity: e.target.value })} />}</Field>
          {mv.type === "in" && <Field label="Coût unitaire d'achat" hint="Met à jour le coût moyen pondéré">{(p) => <Input {...p} type="number" value={mv.unit_cost} onChange={(e) => setMv({ ...mv, unit_cost: e.target.value })} />}</Field>}
          <Field label="Motif" required>{(p) => <Input {...p} value={mv.reason} onChange={(e) => setMv({ ...mv, reason: e.target.value })} placeholder="Commande CMD-…, casse, réception…" />}</Field>
          <div>
            <p className="mb-2 text-sm font-medium">Derniers mouvements</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {history.data?.data.map((h) => (
                <li key={h.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                  <span className={cn("font-mono", h.quantity >= 0 ? "text-success" : "text-danger")}>{h.quantity >= 0 ? "+" : ""}{h.quantity}</span>
                  <span className="flex-1 truncate text-mute">{h.reason}</span>
                  <span className="font-mono text-xs text-faint">{dateTime(h.moved_at)}</span>
                </li>
              ))}
              {!history.data?.data.length && <li className="px-3 py-4 text-center text-sm text-mute">Aucun mouvement.</li>}
            </ul>
          </div>
        </div>
      </Drawer>
    </>
  );
}
