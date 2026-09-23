import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { type CatalogFilters, CatalogueBrowser } from "@/components/site/catalogue-browser";
import { PageHeader } from "@/components/site/page-header";
import { serverApi } from "@/lib/server-api";
import type { Category, Paginated, Product } from "@/lib/types";

async function getCategory(slug: string) {
  return (await serverApi<{ data: Category }>(`/catalog/categories/${encodeURIComponent(slug)}`, undefined, 300))?.data ?? null;
}

export async function generateMetadata({ params }: PageProps<"/catalogue/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategory(category);
  if (!cat) return { title: "Catégorie introuvable" };
  return {
    title: cat.seo_title ?? `${cat.name} personnalisés à Abidjan`,
    description: cat.seo_description ?? cat.tagline ?? undefined,
    alternates: { canonical: `/catalogue/${cat.slug}` },
    openGraph: { title: cat.seo_title ?? cat.name, description: cat.seo_description ?? undefined },
  };
}

export default async function CategoryPage({ params }: PageProps<"/catalogue/[category]">) {
  const { category } = await params;
  const [cat, filters, initial] = await Promise.all([
    getCategory(category),
    serverApi<{ data: CatalogFilters }>("/catalog/filters", undefined, 300),
    serverApi<Paginated<Product>>("/catalog/products", { category, per_page: 12 }, 60),
  ]);
  if (!cat) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.name,
    description: cat.tagline,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: (initial?.data ?? []).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `/produits/${p.slug}`, name: p.name })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader eyebrow={`Catalogue — ${cat.name}`} title={cat.name} body={cat.description ?? cat.tagline} crumbs={[{ href: "/catalogue", label: "Catalogue" }, { href: `/catalogue/${cat.slug}`, label: cat.name }]} />
      <section className="container-x pb-24">
        <Suspense>
          <CatalogueBrowser filters={filters?.data ?? null} lockedCategory={cat.slug} initial={initial} />
        </Suspense>
      </section>
    </>
  );
}
