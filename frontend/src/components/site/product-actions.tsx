"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ChoiceChips, Field, Input } from "@/components/ui/field";
import type { Product } from "@/lib/types";
import { PERSONALIZATION_LABELS } from "@/lib/visuals";
import { EstimateDisplay, useEstimate } from "./estimate-panel";

/** Bloc d'achat de la fiche produit : options → estimation serveur → configurer / devis. */
export function ProductActions({ product }: { product: Product }) {
  const [size, setSize] = useState(product.size_options?.[0]?.label ?? null);
  const [material, setMaterial] = useState<number | null>(product.materials?.[0]?.id ?? null);
  const [finish, setFinish] = useState<number | null>(product.finishes?.[0]?.id ?? null);
  const [modes, setModes] = useState<string[]>(product.personalization_types.slice(0, 1));
  const [qty, setQty] = useState(product.category?.slug === "medailles" ? 50 : 1);
  const [dims, setDims] = useState({ w: 2000, h: 1000 });
  const isArea = product.price.unit === "area";

  const { data, isFetching } = useEstimate({
    product_id: product.id,
    quantity: qty,
    size,
    material_id: material,
    finish_id: finish,
    personalizations: modes,
    ...(isArea ? { width_mm: dims.w, height_mm: dims.h } : {}),
  });

  const quoteHref = `/devis?product=${product.id}&type=${product.category?.slug ?? ""}&qty=${qty}`;

  return (
    <div className="flex flex-col gap-6">
      {product.size_options && product.size_options.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Taille</p>
          <ChoiceChips ariaLabel="Taille" options={product.size_options.map((s) => ({ value: s.label, label: s.label }))} value={size} onChange={(v) => setSize(v as string)} />
        </div>
      )}
      {product.materials && product.materials.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Matériau</p>
          <ChoiceChips ariaLabel="Matériau" options={product.materials.map((m) => ({ value: String(m.id), label: m.name, swatch: m.color_hex ?? undefined }))} value={material ? String(material) : null} onChange={(v) => setMaterial(Number(v))} />
        </div>
      )}
      {product.finishes && product.finishes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Finition</p>
          <ChoiceChips ariaLabel="Finition" options={product.finishes.map((f) => ({ value: String(f.id), label: f.name }))} value={finish ? String(finish) : null} onChange={(v) => setFinish(Number(v))} />
        </div>
      )}
      {product.personalization_types.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Personnalisation</p>
          <ChoiceChips multiple ariaLabel="Personnalisation" options={product.personalization_types.map((p) => ({ value: p, label: PERSONALIZATION_LABELS[p] ?? p }))} value={modes} onChange={(v) => setModes(v as string[])} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Quantité">
          {(p) => <Input {...p} type="number" min={1} max={100000} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} inputMode="numeric" />}
        </Field>
        {isArea && (
          <>
            <Field label="Largeur (mm)">{(p) => <Input {...p} type="number" min={100} value={dims.w} onChange={(e) => setDims({ ...dims, w: Number(e.target.value) })} />}</Field>
            <Field label="Hauteur (mm)">{(p) => <Input {...p} type="number" min={100} value={dims.h} onChange={(e) => setDims({ ...dims, h: Number(e.target.value) })} />}</Field>
          </>
        )}
      </div>

      <EstimateDisplay estimate={data} loading={isFetching} />

      <div className="flex flex-col gap-3 sm:flex-row">
        {product.is_configurable && product.model_3d ? (
          <ButtonLink href={`/configurateur?product=${product.slug}`} size="lg" className="flex-1">
            Personnaliser en 3D
          </ButtonLink>
        ) : null}
        <ButtonLink href={quoteHref} size="lg" variant={product.is_configurable ? "outline" : "primary"} className="flex-1">
          Demander un devis
        </ButtonLink>
      </div>
    </div>
  );
}
