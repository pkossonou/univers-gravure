import type { MetadataRoute } from "next";
import { serverApi } from "@/lib/server-api";
import { SITE } from "@/lib/site";
import type { Category, Paginated, Product } from "@/lib/types";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ["", "/catalogue", "/realisations", "/configurateur", "/studio", "/calculateur", "/devis", "/comment-ca-marche", "/contact", "/scan"].map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "" ? 1 : path === "/catalogue" ? 0.9 : 0.7,
  }));

  const [categories, products] = await Promise.all([
    serverApi<{ data: Category[] }>("/catalog/categories", undefined, 3600),
    serverApi<Paginated<Product>>("/catalog/products", { per_page: 60 }, 3600),
  ]);

  // Toutes les pages produits (pagination côté API)
  const all: Product[] = [...(products?.data ?? [])];
  for (let page = 2; products && page <= products.meta.last_page; page++) {
    const next = await serverApi<Paginated<Product>>("/catalog/products", { per_page: 60, page }, 3600);
    all.push(...(next?.data ?? []));
  }

  return [
    ...staticPages,
    ...(categories?.data ?? []).map((c) => ({ url: `${SITE.url}/catalogue/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...all.map((p) => ({ url: `${SITE.url}/produits/${p.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
