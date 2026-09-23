"use client";

import { useState } from "react";
import { PortfolioManager } from "@/components/admin/portfolio-manager";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/primitives";
import { fcfa } from "@/lib/format";

type Tab = "categories" | "materials" | "finishes" | "tags" | "portfolio";
type R = Record<string, unknown> & { id: number };


export default function CatalogReferencePage() {
  const [tab, setTab] = useState<Tab>("categories");

  return (
    <>
      <PageTitle title="Catégories & matières" description="Référentiel du catalogue et de la galerie de réalisations." />
      <Tabs className="mb-6 w-fit max-w-full" value={tab} onChange={setTab} tabs={[
        { value: "categories", label: "Catégories" }, { value: "materials", label: "Matériaux" }, { value: "finishes", label: "Finitions" },
        { value: "tags", label: "Usages & événements" }, { value: "portfolio", label: "Réalisations" },
      ]} />

      {tab === "categories" && (
        <ResourceManager<R>
          key="categories" endpoint="/admin/categories" permission="products" title="Catégories" singular="Catégorie" initialSort="sort_order"
          columns={[
            { key: "name", header: "Nom", sort: "name", cell: (r) => <span className="font-medium">{String(r.name)}</span> },
            { key: "slug", header: "Slug", cell: (r) => <span className="font-mono text-xs text-mute">{String(r.slug)}</span> },
            { key: "products_count", header: "Produits", align: "right", cell: (r) => Number(r.products_count ?? 0) },
            { key: "show_in_services", header: "Services (accueil)", cell: (r) => (r.show_in_services ? <Badge tone="accent">Oui</Badge> : "—") },
            { key: "is_active", header: "Actif", cell: (r) => (r.is_active ? <Badge tone="success">Actif</Badge> : <Badge>Inactif</Badge>) },
          ]}
          defaults={{ is_active: true, sort_order: 0 }}
          fields={[
            { name: "name", label: "Nom", required: true, span: 1 }, { name: "slug", label: "Slug", hint: "Auto si vide", span: 1 },
            { name: "tagline", label: "Accroche" }, { name: "description", label: "Description", type: "textarea" },
            { name: "image", label: "Image de la catégorie (JPG, PNG, WEBP — 10 Mo)", type: "file", accept: "image/jpeg,image/png,image/webp", previewFrom: "image_url" },
            { name: "sort_order", label: "Ordre", type: "number", span: 1 },
            { name: "is_active", label: "Active", type: "checkbox", span: 1 }, { name: "show_in_services", label: "Affichée dans les services de l'accueil", type: "checkbox" },
            { name: "seo_title", label: "Titre SEO" }, { name: "seo_description", label: "Description SEO", type: "textarea" },
          ]}
        />
      )}
      {tab === "materials" && (
        <ResourceManager<R>
          key="materials" endpoint="/admin/materials" permission="products" title="Matériaux" singular="Matériau" initialSort="name"
          columns={[
            { key: "name", header: "Matériau", sort: "name", cell: (r) => <span className="flex items-center gap-2"><span className="size-4 rounded-full border border-line" style={{ background: String(r.color_hex ?? "#ccc") }} />{String(r.name)}</span> },
            { key: "price_multiplier", header: "Coefficient prix", sort: "price_multiplier", align: "right", cell: (r) => `× ${Number(r.price_multiplier).toLocaleString("fr-FR")}` },
            { key: "price_per_m2", header: "Prix au m²", align: "right", cell: (r) => (r.price_per_m2 ? fcfa(Number(r.price_per_m2)) : "—") },
            { key: "products_count", header: "Produits", align: "right", cell: (r) => Number(r.products_count ?? 0) },
          ]}
          defaults={{ price_multiplier: 1, is_active: true }}
          fields={[
            { name: "name", label: "Nom", required: true, span: 1 }, { name: "color_hex", label: "Couleur (#RRGGBB)", span: 1 },
            { name: "price_multiplier", label: "Coefficient de prix", type: "number", required: true, hint: "1 = neutre ; 1,35 = +35 %", span: 1 },
            { name: "price_per_m2", label: "Prix au m² (impression)", type: "number", span: 1 },
            { name: "description", label: "Description", type: "textarea" }, { name: "is_active", label: "Actif", type: "checkbox" },
          ]}
        />
      )}
      {tab === "finishes" && (
        <ResourceManager<R>
          key="finishes" endpoint="/admin/finishes" permission="products" title="Finitions" singular="Finition" initialSort="name"
          columns={[
            { key: "name", header: "Finition", sort: "name", cell: (r) => String(r.name) },
            { key: "price_multiplier", header: "Coefficient", align: "right", cell: (r) => `× ${Number(r.price_multiplier).toLocaleString("fr-FR")}` },
            { key: "flat_fee", header: "Frais fixes", align: "right", cell: (r) => fcfa(Number(r.flat_fee ?? 0)) },
          ]}
          defaults={{ price_multiplier: 1, flat_fee: 0, is_active: true }}
          fields={[
            { name: "name", label: "Nom", required: true }, { name: "price_multiplier", label: "Coefficient", type: "number", required: true, span: 1 },
            { name: "flat_fee", label: "Frais fixes (FCFA)", type: "number", span: 1 }, { name: "description", label: "Description", type: "textarea" },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      )}
      {tab === "tags" && (
        <ResourceManager<R>
          key="tags" endpoint="/admin/tags" permission="products" title="Usages" singular="Étiquette" initialSort="name"
          columns={[
            { key: "name", header: "Nom", sort: "name", cell: (r) => String(r.name) },
            { key: "type", header: "Type", sort: "type", cell: (r) => <Badge>{r.type === "usage" ? "Usage" : r.type === "event" ? "Événement" : "Général"}</Badge> },
            { key: "products_count", header: "Produits", align: "right", cell: (r) => Number(r.products_count ?? 0) },
          ]}
          defaults={{ type: "usage" }}
          fields={[
            { name: "name", label: "Nom", required: true },
            { name: "type", label: "Type", type: "select", required: true, options: [{ value: "usage", label: "Usage" }, { value: "event", label: "Événement" }, { value: "general", label: "Général" }] },
          ]}
        />
      )}
      {tab === "portfolio" && <PortfolioManager />}
    </>
  );
}
