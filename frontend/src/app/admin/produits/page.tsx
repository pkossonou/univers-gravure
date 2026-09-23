"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { opts, useLookups } from "@/components/admin/lookups";
import { PageTitle } from "@/components/admin/shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { useTable } from "@/lib/hooks";
import type { Product } from "@/lib/types";

const STATUS = { draft: "Brouillon", published: "Publié", archived: "Archivé" };

export default function ProductsAdmin() {
  const router = useRouter();
  const { can } = useAuth();
  const lookups = useLookups();
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const { state, setState, query } = useTable<Product>("/admin/products", "-created_at", { "filter[category_id]": category || undefined, "filter[status]": status || undefined });

  return (
    <>
      <PageTitle title="Produits" description="Catalogue publié sur le site : prix, matières, options, visuels, SEO." actions={can("products.create") ? <ButtonLink href="/admin/produits/nouveau" size="sm">Nouveau produit</ButtonLink> : undefined} />
      <DataTable<Product>
        toolbar={
          <>
            <Select aria-label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-48">
              <option value="">Toutes catégories</option>
              {opts(lookups?.categories).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-40">
              <option value="">Tous statuts</option>
              {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </>
        }
        columns={[
          { key: "image", header: "", cell: (p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images?.[0]?.src} alt="" className="size-11 rounded-lg border border-line object-cover" />
          ) },
          { key: "name", header: "Produit", sort: "name", cell: (p) => <span><span className="font-medium">{p.name}</span><span className="block font-mono text-xs text-faint">{p.reference}</span></span> },
          { key: "category", header: "Catégorie", cell: (p) => p.category?.name, desktopOnly: true },
          { key: "base_price", header: "Prix de base", sort: "base_price", align: "right", cell: (p) => (p.base_price ? `${fcfa(p.base_price)}${p.price.unit === "area" ? "/m²" : ""}` : "Sur devis") },
          { key: "requests_count", header: "Demandes", sort: "requests_count", align: "right", cell: (p) => p.requests_count ?? 0, desktopOnly: true },
          { key: "views_count", header: "Vues", sort: "views_count", align: "right", cell: (p) => p.views_count ?? 0, hidden: true },
          { key: "flags", header: "", cell: (p) => <span className="flex gap-1">{p.is_featured && <Badge tone="accent">Vedette</Badge>}{p.is_configurable && <Badge>3D</Badge>}</span>, desktopOnly: true },
          { key: "status", header: "Statut", cell: (p) => <StatusBadge status={p.status === "published" ? "done" : p.status === "draft" ? "pending" : "cancelled"} label={STATUS[p.status as keyof typeof STATUS]} /> },
        ]}
        rows={query.data?.data}
        meta={query.data?.meta}
        loading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
        state={state}
        onStateChange={setState}
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/admin/produits/${p.id}`)}
        searchPlaceholder="Nom, référence…"
        storageKey="products"
      />
    </>
  );
}
