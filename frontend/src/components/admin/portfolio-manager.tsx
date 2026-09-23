"use client";

import { ResourceManager } from "@/components/admin/resource-manager";
import { Badge } from "@/components/ui/badge";

type R = Record<string, unknown> & { id: number };

export const PORTFOLIO_CATS = [
  { value: "trophees", label: "Trophées" }, { value: "medailles", label: "Médailles" }, { value: "plaques", label: "Plaques" },
  { value: "gravure", label: "Gravure" }, { value: "impression", label: "Impression" }, { value: "evenements", label: "Événements" },
  { value: "entreprises", label: "Entreprises" }, { value: "cadeaux", label: "Cadeaux personnalisés" },
];

/** Galerie « Réalisations » : photos et vidéos envoyées directement depuis le back-office. */
export function PortfolioManager() {
  return (
    <ResourceManager<R>
            key="portfolio" endpoint="/admin/portfolio" permission="products" title="Réalisations" singular="Réalisation" initialSort="sort_order"
            columns={[
              { key: "image", header: "", cell: (r) => (r.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={String(r.image_url)} alt="" className="size-11 rounded-lg object-cover" />
              ) : r.video_url ? <video src={String(r.video_url)} muted className="size-11 rounded-lg object-cover" /> : null) },
              { key: "title", header: "Titre", sort: "title", cell: (r) => String(r.title) },
              { key: "category", header: "Catégorie", cell: (r) => <Badge>{PORTFOLIO_CATS.find((c) => c.value === r.category)?.label ?? String(r.category)}</Badge> },
              { key: "year", header: "Année", sort: "year", cell: (r) => String(r.year ?? "—") },
              { key: "is_published", header: "Publié", cell: (r) => (r.is_published ? <Badge tone="success">Oui</Badge> : <Badge>Non</Badge>) },
            ]}
            defaults={{ ratio: "portrait", is_published: true, category: "trophees" }}
            fields={[
              { name: "title", label: "Titre", required: true },
              { name: "category", label: "Catégorie", type: "select", options: PORTFOLIO_CATS, required: true, span: 1 },
              { name: "ratio", label: "Format", type: "select", options: [{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Paysage" }, { value: "square", label: "Carré" }], span: 1 },
              { name: "image", label: "Photo (JPG, PNG, WEBP — 10 Mo)", type: "file", accept: "image/jpeg,image/png,image/webp", previewFrom: "image_url", hint: "Photo principale affichée dans la galerie" },
              { name: "video", label: "Vidéo (MP4, WEBM, MOV — 60 Mo, facultatif)", type: "file", accept: "video/mp4,video/webm,video/quicktime", previewFrom: "video_url" },
              { name: "before_image", label: "Photo « avant » (facultatif, comparaison avant / après)", type: "file", accept: "image/jpeg,image/png,image/webp", previewFrom: "before_image_url" },
              { name: "client_label", label: "Client / contexte", span: 1 }, { name: "year", label: "Année", type: "number", span: 1 },
              { name: "description", label: "Description", type: "textarea" }, { name: "is_published", label: "Publiée", type: "checkbox" },
            ]}
          />
  );
}
