"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLookups } from "@/components/admin/lookups";
import { PageTitle } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card, CardHeader, ErrorState, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Product, SizeOption } from "@/lib/types";
import { PERSONALIZATION_LABELS } from "@/lib/visuals";

const EMPTY = {
  name: "", reference: "", slug: "", category_id: "", short_description: "", description: "", base_price: "", min_price: "",
  price_unit: "unit", is_price_visible: true, availability: "on_order", lead_time_min_days: 3, lead_time_max_days: 7,
  width: "", height: "", depth: "", personalization_types: [] as string[], is_configurable: false, model_3d: "", stock_quantity: "",
  status: "draft", is_featured: false, seo_title: "", seo_description: "", material_ids: [] as number[], finish_ids: [] as number[], tag_ids: [] as number[],
  size_options: [] as SizeOption[],
};

export default function ProductEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "nouveau";
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const { can } = useAuth();
  const lookups = useLookups();
  const { data, isPending, error, refetch } = useApi<{ data: Product }>(isNew ? null : `/admin/products/${id}`);
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [upload, setUpload] = useState<{ file: File | null; alt: string }>({ file: null, alt: "" });

  const p = data?.data;
  useEffect(() => {
    if (!p) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
    setF({
      ...EMPTY,
      name: p.name, reference: p.reference, slug: p.slug, category_id: String(p.category_id ?? ""), short_description: p.short_description ?? "", description: p.description ?? "",
      base_price: p.base_price?.toString() ?? "", min_price: p.min_price?.toString() ?? "", price_unit: p.price.unit, is_price_visible: !!p.is_price_visible,
      availability: p.availability, lead_time_min_days: p.lead_time_min_days ?? 3, lead_time_max_days: p.lead_time_max_days ?? 7,
      width: p.dimensions?.width?.toString() ?? "", height: p.dimensions?.height?.toString() ?? "", depth: p.dimensions?.depth?.toString() ?? "",
      personalization_types: p.personalization_types, is_configurable: p.is_configurable, model_3d: p.model_3d ?? "", stock_quantity: p.stock_quantity?.toString() ?? "",
      status: p.status ?? "draft", is_featured: p.is_featured, seo_title: p.seo_title ?? "", seo_description: p.seo_description ?? "",
      material_ids: p.materials?.map((m) => m.id) ?? [], finish_ids: p.finishes?.map((x) => x.id) ?? [], tag_ids: p.tags?.map((t) => t.id) ?? [],
      size_options: p.size_options ?? [],
    });
  }, [p]);

  const num = (v: string | number) => (v === "" || v === null ? null : Number(v));
  const toggleId = (key: "material_ids" | "finish_ids" | "tag_ids", idv: number) => setF((s) => ({ ...s, [key]: s[key].includes(idv) ? s[key].filter((x) => x !== idv) : [...s[key], idv] }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    const body = {
      ...f,
      category_id: num(f.category_id), base_price: num(f.base_price), min_price: num(f.min_price), stock_quantity: num(f.stock_quantity),
      model_3d: f.model_3d || null, slug: f.slug || undefined,
      dimensions: f.height ? { width: num(f.width), height: num(f.height), depth: num(f.depth) } : null,
      size_options: f.size_options.length ? f.size_options : null,
    };
    try {
      const res = await api<{ data: Product }>(isNew ? "/admin/products" : `/admin/products/${id}`, { method: isNew ? "POST" : "PUT", body });
      toast.success("Produit enregistré");
      client.invalidateQueries({ queryKey: ["/admin/products"] });
      if (isNew) router.replace(`/admin/produits/${res.data.id}`);
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

  const addImage = async () => {
    if (!upload.file) return;
    const form = new FormData();
    form.append("image", upload.file);
    form.append("alt", upload.alt || f.name);
    try {
      await api(`/admin/products/${id}/images`, { method: "POST", body: form });
      setUpload({ file: null, alt: "" });
      toast.success("Image ajoutée");
      refetch();
    } catch (e) {
      toast.error("Image refusée", e instanceof ApiError ? Object.values(e.errors)[0]?.[0] ?? e.message : undefined);
    }
  };

  const removeImage = async (imageId: number) => {
    await api(`/admin/products/${id}/images/${imageId}`, { method: "DELETE" });
    refetch();
  };

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!isNew && (isPending || !p)) return <Skeleton className="h-96 rounded-2xl" />;
  const readOnly = !can(isNew ? "products.create" : "products.update");

  return (
    <>
      <Link href="/admin/produits" className="font-mono text-xs tracking-widest text-faint hover:text-ink">← PRODUITS</Link>
      <PageTitle
        title={isNew ? "Nouveau produit" : f.name}
        description={isNew ? undefined : f.reference}
        actions={
          <>
            {!isNew && p?.status === "published" && <Link href={`/produits/${p.slug}`} target="_blank" className="self-center text-sm text-accent-strong">Voir sur le site ↗</Link>}
            {!readOnly && <Button loading={saving} onClick={save}>Enregistrer</Button>}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Informations" />
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Nom" required error={errors.name}>{(pp) => <Input {...pp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
              <Field label="Référence" required error={errors.reference}>{(pp) => <Input {...pp} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} className="font-mono" />}</Field>
              <Field label="Catégorie" required error={errors.category_id}>
                {(pp) => <Select {...pp} value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}><option value="">—</option>{lookups?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}
              </Field>
              <Field label="Slug (URL)" hint="Généré depuis le nom si vide" error={errors.slug}>{(pp) => <Input {...pp} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className="font-mono" />}</Field>
              <Field label="Accroche courte" className="md:col-span-2" error={errors.short_description}>{(pp) => <Input {...pp} value={f.short_description} maxLength={320} onChange={(e) => setF({ ...f, short_description: e.target.value })} />}</Field>
              <Field label="Description" className="md:col-span-2">{(pp) => <Textarea {...pp} rows={6} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Prix & disponibilité" description="Ces valeurs alimentent le calculateur d'estimation" />
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <Field label="Prix de base (FCFA)" error={errors.base_price} hint="Vide = sur devis">{(pp) => <Input {...pp} type="number" value={f.base_price} onChange={(e) => setF({ ...f, base_price: e.target.value })} />}</Field>
              <Field label="Prix minimum" error={errors.min_price}>{(pp) => <Input {...pp} type="number" value={f.min_price} onChange={(e) => setF({ ...f, min_price: e.target.value })} />}</Field>
              <Field label="Unité de prix">{(pp) => <Select {...pp} value={f.price_unit} onChange={(e) => setF({ ...f, price_unit: e.target.value })}><option value="unit">À l&apos;unité</option><option value="area">Au m²</option></Select>}</Field>
              <Field label="Disponibilité">{(pp) => <Select {...pp} value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value })}><option value="in_stock">En stock</option><option value="on_order">À la commande</option><option value="unavailable">Indisponible</option></Select>}</Field>
              <Field label="Délai min (jours)" error={errors.lead_time_min_days}>{(pp) => <Input {...pp} type="number" value={f.lead_time_min_days} onChange={(e) => setF({ ...f, lead_time_min_days: Number(e.target.value) })} />}</Field>
              <Field label="Délai max (jours)" error={errors.lead_time_max_days}>{(pp) => <Input {...pp} type="number" value={f.lead_time_max_days} onChange={(e) => setF({ ...f, lead_time_max_days: Number(e.target.value) })} />}</Field>
              <Field label="Stock (pièces)">{(pp) => <Input {...pp} type="number" value={f.stock_quantity} onChange={(e) => setF({ ...f, stock_quantity: e.target.value })} />}</Field>
              <div className="flex items-end md:col-span-2"><Checkbox label="Afficher le prix sur le site" checked={f.is_price_visible} onChange={(e) => setF({ ...f, is_price_visible: e.target.checked })} /></div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Dimensions & tailles" description="Hauteur de référence en mm ; chaque taille applique un multiplicateur de prix" />
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <Field label="Largeur (mm)">{(pp) => <Input {...pp} type="number" value={f.width} onChange={(e) => setF({ ...f, width: e.target.value })} />}</Field>
              <Field label="Hauteur (mm)">{(pp) => <Input {...pp} type="number" value={f.height} onChange={(e) => setF({ ...f, height: e.target.value })} />}</Field>
              <Field label="Profondeur (mm)">{(pp) => <Input {...pp} type="number" value={f.depth} onChange={(e) => setF({ ...f, depth: e.target.value })} />}</Field>
            </div>
            <div className="flex flex-col gap-2 border-t border-line p-5">
              {f.size_options.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_7rem_7rem_auto] gap-2">
                  <Input aria-label="Libellé" value={s.label} onChange={(e) => setF({ ...f, size_options: f.size_options.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} className="h-10" />
                  <Input aria-label="Hauteur mm" type="number" value={s.height_mm ?? ""} onChange={(e) => setF({ ...f, size_options: f.size_options.map((x, k) => (k === i ? { ...x, height_mm: Number(e.target.value) } : x)) })} className="h-10" />
                  <Input aria-label="Multiplicateur" type="number" step={0.05} value={s.multiplier} onChange={(e) => setF({ ...f, size_options: f.size_options.map((x, k) => (k === i ? { ...x, multiplier: Number(e.target.value) } : x)) })} className="h-10" />
                  <Button size="sm" variant="ghost" onClick={() => setF({ ...f, size_options: f.size_options.filter((_, k) => k !== i) })}>Retirer</Button>
                </div>
              ))}
              <Button size="sm" variant="secondary" className="self-start" onClick={() => setF({ ...f, size_options: [...f.size_options, { label: "", height_mm: undefined, multiplier: 1 }] })}>+ Ajouter une taille</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Matières, finitions, personnalisation & usages" />
            <div className="flex flex-col gap-5 p-5">
              <div><p className="mb-2 text-sm font-medium">Matériaux</p><Chips readOnly={readOnly} list={lookups?.materials} selected={f.material_ids} onToggle={(i) => toggleId("material_ids", i)} /></div>
              <div><p className="mb-2 text-sm font-medium">Finitions</p><Chips readOnly={readOnly} list={lookups?.finishes} selected={f.finish_ids} onToggle={(i) => toggleId("finish_ids", i)} /></div>
              <div>
                <p className="mb-2 text-sm font-medium">Personnalisation</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PERSONALIZATION_LABELS).map(([k, l]) => (
                    <button key={k} type="button" aria-pressed={f.personalization_types.includes(k)} onClick={() => setF({ ...f, personalization_types: f.personalization_types.includes(k) ? f.personalization_types.filter((x) => x !== k) : [...f.personalization_types, k] })} className={cn("rounded-full border px-3 py-1 text-sm", f.personalization_types.includes(k) ? "border-accent bg-accent/10" : "border-line-strong text-mute")}>{l}</button>
                  ))}
                </div>
              </div>
              <div><p className="mb-2 text-sm font-medium">Usages & événements</p><Chips readOnly={readOnly} list={lookups?.tags.map((t) => ({ id: t.id, name: `${t.name}${t.type === "event" ? " ◦" : ""}` }))} selected={f.tag_ids} onToggle={(i) => toggleId("tag_ids", i)} /></div>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Publication" />
            <div className="grid gap-4 p-5">
              <Field label="Statut">{(pp) => <Select {...pp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></Select>}</Field>
              <Checkbox label="Mettre en vedette (page d'accueil)" checked={f.is_featured} onChange={(e) => setF({ ...f, is_featured: e.target.checked })} />
              <Checkbox label="Configurable en 3D" checked={f.is_configurable} onChange={(e) => setF({ ...f, is_configurable: e.target.checked })} />
              {f.is_configurable && (
                <Field label="Modèle 3D">{(pp) => <Select {...pp} value={f.model_3d} onChange={(e) => setF({ ...f, model_3d: e.target.value })}><option value="">—</option>{["cup", "star", "column", "crystal", "medal", "plaque"].map((m) => <option key={m} value={m}>{m}</option>)}</Select>}</Field>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="SEO" />
            <div className="grid gap-4 p-5">
              <Field label="Titre SEO" hint={`${f.seo_title.length}/60 recommandé`}>{(pp) => <Input {...pp} value={f.seo_title} onChange={(e) => setF({ ...f, seo_title: e.target.value })} />}</Field>
              <Field label="Description SEO" hint={`${f.seo_description.length}/160 recommandé`}>{(pp) => <Textarea {...pp} rows={3} value={f.seo_description} onChange={(e) => setF({ ...f, seo_description: e.target.value })} />}</Field>
            </div>
          </Card>
          {!isNew && (
            <Card>
              <CardHeader title="Visuels" description="JPG/PNG/WEBP, 400 px min., texte alternatif obligatoire" />
              <div className="grid grid-cols-3 gap-2 p-5">
                {p?.images?.map((img) => (
                  <div key={img.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.alt} className="aspect-square w-full rounded-lg border border-line object-cover" />
                    {!readOnly && <button type="button" onClick={() => removeImage(img.id)} className="absolute top-1 right-1 rounded-full bg-black/60 px-2 text-xs text-white opacity-0 group-hover:opacity-100" aria-label={`Supprimer ${img.alt}`}>×</button>}
                  </div>
                ))}
              </div>
              {!readOnly && (
                <div className="grid gap-2 border-t border-line p-5">
                  <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] ?? null })} className="pt-2.5" aria-label="Image" />
                  <Input placeholder="Texte alternatif (description de l'image)" value={upload.alt} onChange={(e) => setUpload({ ...upload, alt: e.target.value })} aria-label="Texte alternatif" />
                  <Button size="sm" variant="secondary" disabled={!upload.file || !upload.alt} onClick={addImage}>Ajouter l&apos;image</Button>
                </div>
              )}
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

function Chips({ list, selected, onToggle, readOnly }: { list?: { id: number; name: string }[]; selected: number[]; onToggle: (id: number) => void; readOnly: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {list?.map((i) => (
        <button key={i.id} type="button" disabled={readOnly} aria-pressed={selected.includes(i.id)} onClick={() => onToggle(i.id)} className={cn("rounded-full border px-3 py-1 text-sm transition", selected.includes(i.id) ? "border-accent bg-accent/10 text-ink" : "border-line-strong text-mute")}>
          {i.name}
        </button>
      ))}
    </div>
  );
}
