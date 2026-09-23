import type { Metadata } from "next";
import { Suspense } from "react";
import { type CatalogFilters, CatalogueBrowser } from "@/components/site/catalogue-browser";
import { PageHeader } from "@/components/site/page-header";
import { serverApi } from "@/lib/server-api";
import type { Paginated, Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Catalogue — trophées, médailles, plaques, gravure et impression",
  description: "Trophées personnalisés, médailles, plaques gravées, impression grand format, signalétique et cadeaux d'entreprise. Fabrication à Abidjan.",
  alternates: { canonical: "/catalogue" },
};

export default async function CataloguePage() {
  const [filters, initial] = await Promise.all([
    serverApi<{ data: CatalogFilters }>("/catalog/filters", undefined, 300),
    serverApi<Paginated<Product>>("/catalog/products", { per_page: 12 }, 60),
  ]);

  return (
    <>
      <PageHeader eyebrow="Catalogue" title={<>Chaque pièce,<br /><span className="metal-text italic">à votre nom.</span></>} body="Filtrez par matière, usage ou événement. Chaque produit se personnalise : texte, logo, finition, quantité." />
      <section className="container-x pb-24">
        <Suspense>
          <CatalogueBrowser filters={filters?.data ?? null} initial={initial} />
        </Suspense>
      </section>
    </>
  );
}
