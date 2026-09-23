"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Checkbox, ChoiceChips, Field, Input, Select } from "@/components/ui/field";
import { api } from "@/lib/api";
import { PROJECT_TYPES } from "@/lib/site";
import type { Finish, Material, Paginated, Product } from "@/lib/types";
import { PERSONALIZATION_LABELS } from "@/lib/visuals";
import { EstimateDisplay, useEstimate } from "./estimate-panel";

export function Calculator() {
  const [type, setType] = useState("trophee");
  const [productId, setProductId] = useState<number | null>(null);
  const [qty, setQty] = useState(10);
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [material, setMaterial] = useState<number | null>(null);
  const [finish, setFinish] = useState<number | null>(null);
  const [modes, setModes] = useState<string[]>(["gravure"]);
  const [logo, setLogo] = useState(false);
  const [urgency, setUrgency] = useState("standard");

  const products = useQuery({ queryKey: ["calc-products"], queryFn: () => api<Paginated<Product>>("/catalog/products", { query: { per_page: 60, sort: "name" } }), staleTime: 300_000 });
  const materials = useQuery({ queryKey: ["materials"], queryFn: () => api<{ data: Material[] }>("/catalog/materials").then((r) => r.data), staleTime: 600_000 });
  const finishes = useQuery({ queryKey: ["finishes"], queryFn: () => api<{ data: Finish[] }>("/catalog/finishes").then((r) => r.data), staleTime: 600_000 });
  const product = products.data?.data.find((p) => p.id === productId);

  const estimate = useEstimate({
    product_id: productId,
    project_type: productId ? null : type,
    quantity: qty,
    width_mm: Number(w) || null,
    height_mm: Number(h) || null,
    material_id: material,
    finish_id: finish,
    personalizations: modes,
    has_logo: logo,
    urgency,
  });

  const params = new URLSearchParams({ type, qty: String(qty), ...(productId ? { product: String(productId) } : {}) });

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type de produit">
            {(p) => (
              <Select {...p} value={type} onChange={(e) => (setType(e.target.value), setProductId(null))}>
                {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Modèle du catalogue" hint="Facultatif : affine l'estimation">
            {(p) => (
              <Select {...p} value={productId ?? ""} onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Projet sur mesure</option>
                {products.data?.data.map((pr) => <option key={pr.id} value={pr.id}>{pr.name} — {pr.category?.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Quantité">{(p) => <Input {...p} type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} inputMode="numeric" />}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Largeur (mm)">{(p) => <Input {...p} type="number" min={5} value={w} onChange={(e) => setW(e.target.value)} />}</Field>
            <Field label="Hauteur (mm)">{(p) => <Input {...p} type="number" min={5} value={h} onChange={(e) => setH(e.target.value)} />}</Field>
          </div>
          <Field label="Matériau">
            {(p) => (
              <Select {...p} value={material ?? ""} onChange={(e) => setMaterial(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Standard</option>
                {(product?.materials ?? materials.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Finition">
            {(p) => (
              <Select {...p} value={finish ?? ""} onChange={(e) => setFinish(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Standard</option>
                {(product?.finishes ?? finishes.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Personnalisation, impression, gravure</p>
          <ChoiceChips multiple ariaLabel="Personnalisation" options={Object.entries(PERSONALIZATION_LABELS).filter(([k]) => k !== "broderie").map(([value, label]) => ({ value, label }))} value={modes} onChange={(v) => setModes(v as string[])} />
        </div>
        <Checkbox checked={logo} onChange={(e) => setLogo(e.target.checked)} label="J'ai un logo à reproduire (préparation de fichier)" />
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Délai souhaité</p>
          <ChoiceChips ariaLabel="Délai" options={[{ value: "flexible", label: "Flexible" }, { value: "standard", label: "Standard" }, { value: "express", label: "Express" }]} value={urgency} onChange={(v) => setUrgency(v as string)} />
        </div>
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
        <EstimateDisplay estimate={estimate.data} loading={estimate.isFetching} />
        <ButtonLink href={`/devis?${params}`} size="lg">Transformer en demande de devis</ButtonLink>
      </aside>
    </div>
  );
}
