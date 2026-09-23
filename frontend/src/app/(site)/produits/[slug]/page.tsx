import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/site/product-actions";
import { ProductCard } from "@/components/site/product-card";
import { ProductGallery } from "@/components/site/product-gallery";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/primitives";
import { fcfa } from "@/lib/format";
import { serverApi } from "@/lib/server-api";
import { SITE } from "@/lib/site";
import type { Product } from "@/lib/types";
import { PERSONALIZATION_LABELS } from "@/lib/visuals";

async function getProduct(slug: string) {
  return serverApi<{ data: Product; related: Product[] }>(`/catalog/products/${encodeURIComponent(slug)}`, undefined, 60);
}

export async function generateMetadata({ params }: PageProps<"/produits/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const res = await getProduct(slug);
  if (!res) return { title: "Produit introuvable" };
  const p = res.data;
  return {
    title: p.seo?.title ?? p.name,
    description: p.seo?.description ?? p.short_description ?? undefined,
    alternates: { canonical: `/produits/${p.slug}` },
    openGraph: { title: p.name, description: p.short_description ?? undefined, images: p.images?.[0] ? [{ url: p.images[0].src, alt: p.images[0].alt }] : undefined },
  };
}

const AVAILABILITY = { in_stock: ["En stock", "success"], on_order: ["Fabriqué à la commande", "accent"], unavailable: ["Indisponible", "neutral"] } as const;

export default async function ProductPage({ params }: PageProps<"/produits/[slug]">) {
  const { slug } = await params;
  const res = await getProduct(slug);
  if (!res) notFound();
  const { data: p, related } = res;
  const [availabilityLabel, availabilityTone] = AVAILABILITY[p.availability];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.reference,
    description: p.short_description,
    image: p.images?.map((i) => new URL(i.src, SITE.url).toString()),
    category: p.category?.name,
    brand: { "@type": "Brand", name: SITE.name },
    ...(p.price.from
      ? { offers: { "@type": "Offer", priceCurrency: "XOF", price: p.price.from, availability: p.availability === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/PreOrder", seller: { "@type": "Organization", name: SITE.name } } }
      : {}),
  };

  const specs = [
    ["Référence", p.reference],
    ["Dimensions", p.dimensions?.height ? `${p.dimensions.width ?? "—"} × ${p.dimensions.height} × ${p.dimensions.depth ?? "—"} mm` : p.price.unit === "area" ? "Sur mesure (au m²)" : "Sur mesure"],
    ["Matériaux", p.materials?.map((m) => m.name).join(", ") || "—"],
    ["Finitions", p.finishes?.map((f) => f.name).join(", ") || "—"],
    ["Personnalisation", p.personalization_types.map((x) => PERSONALIZATION_LABELS[x] ?? x).join(", ") || "—"],
    ["Délai estimatif", `${p.lead_time.min} à ${p.lead_time.max} jours ouvrés`],
    ["Prix indicatif", p.price.on_quote ? "Sur devis" : `Dès ${fcfa(p.price.from)}${p.price.unit === "area" ? " / m²" : ""}`],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="pt-28 md:pt-36">
        <div className="container-x">
          <nav aria-label="Fil d'Ariane" className="mb-8 font-mono text-xs tracking-wider text-faint">
            <Link href="/catalogue" className="hover:text-ink">Catalogue</Link>
            {p.category && (
              <>
                {" / "}
                <Link href={`/catalogue/${p.category.slug}`} className="hover:text-ink">{p.category.name}</Link>
              </>
            )}
          </nav>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <ProductGallery images={p.images ?? []} name={p.name} />
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={availabilityTone} dot>{availabilityLabel}</Badge>
                {p.is_configurable && <Badge tone="accent">Configurable en 3D</Badge>}
              </div>
              <h1 className="display mt-5 text-5xl text-ink md:text-6xl">{p.name}</h1>
              <p className="mt-2 font-mono text-xs tracking-widest text-faint">{p.reference}</p>
              {p.short_description && <p className="mt-5 text-lg leading-relaxed text-mute">{p.short_description}</p>}
              <div className="mt-8">
                <ProductActions product={p} />
              </div>
            </div>
          </div>

          <div className="mt-24 grid gap-12 border-t border-line pt-16 md:grid-cols-2">
            <Reveal>
              <p className="eyebrow">Description</p>
              <div className="mt-5 space-y-4 leading-relaxed whitespace-pre-line text-mute">{p.description}</div>
              {p.tags && p.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {p.tags.map((t) => <Badge key={t.id}>{t.name}</Badge>)}
                </div>
              )}
            </Reveal>
            <Reveal delay={0.1}>
              <p className="eyebrow">Caractéristiques</p>
              <dl className="mt-5 divide-y divide-line border-y border-line">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[10rem_1fr] gap-4 py-3 text-sm">
                    <dt className="text-faint">{k}</dt>
                    <dd className="text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-x mt-24 pb-8">
          <p className="eyebrow">Dans le même univers</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </>
  );
}


// Pré-rendu des fiches les plus consultées au build ; les autres sont rendues à la demande (ISR)
export async function generateStaticParams() {
  const res = await serverApi<{ data: Product[] }>("/catalog/products", { per_page: 24 }, 300);
  return (res?.data ?? []).map((p) => ({ slug: p.slug }));
}

export const dynamicParams = true;
