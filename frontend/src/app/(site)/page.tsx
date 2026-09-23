import Link from "next/link";
import { Hero } from "@/components/site/hero";
import { ProcessSteps } from "@/components/site/process-steps";
import { PortfolioThumb } from "@/components/site/portfolio-thumb";
import { ProductCard } from "@/components/site/product-card";
import { ServiceCards } from "@/components/site/service-cards";
import { ButtonLink } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Accordion, BeamLine, Reveal, SectionHeading } from "@/components/ui/primitives";
import { getContent } from "@/lib/content";
import { serverApi } from "@/lib/server-api";
import { PROJECT_TYPES, SITE } from "@/lib/site";
import type { Category, Paginated, PortfolioItem, Product } from "@/lib/types";

const FAQ = [
  { q: "Quel est le délai de fabrication ?", a: "Il dépend du produit et de la quantité : chaque fiche indique un délai estimatif, et l'option express réduit ce délai de moitié lorsque c'est possible. Le délai définitif figure sur votre devis." },
  { q: "Puis-je voir mon trophée avant la fabrication ?", a: "Oui. Le configurateur 3D vous montre le rendu en direct, puis notre équipe vous envoie un BAT (bon à tirer) à valider avant toute production." },
  { q: "Quels fichiers dois-je envoyer pour mon logo ?", a: "Idéalement un fichier vectoriel (SVG, PDF, AI ou EPS). Un PNG ou JPG en bonne résolution convient aussi : nous vous prévenons si une vectorisation est nécessaire." },
  { q: "L'estimation en ligne est-elle un prix définitif ?", a: "Non. C'est une estimation calculée à partir de nos tarifs. Le prix définitif figure sur le devis validé par notre équipe, qui tient compte de tous les détails de votre projet." },
  { q: "Livrez-vous en dehors d'Abidjan ?", a: "Oui, dans toute la Côte d'Ivoire. Le retrait à l'atelier reste possible pour toutes les commandes." },
];

export default async function HomePage() {
  const [content, categories, featured, portfolio] = await Promise.all([
    getContent(),
    serverApi<{ data: Category[] }>("/catalog/categories", undefined, 300),
    serverApi<Paginated<Product>>("/catalog/products", { featured: 1, per_page: 8 }, 120),
    serverApi<{ data: PortfolioItem[] }>("/portfolio", undefined, 300),
  ]);
  const services = (categories?.data ?? []).filter((c) => c.show_in_services).slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    address: { "@type": "PostalAddress", addressLocality: SITE.city, addressCountry: "CI" },
    areaServed: "Côte d'Ivoire",
    makesOffer: services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero
        text={{
          eyebrow: content["hero.eyebrow"],
          lines: [content["hero.title_1"], content["hero.title_2"], content["hero.title_3"]],
          subtitle: content["hero.subtitle"],
          ctaPrimary: content["hero.cta_primary"],
          ctaSecondary: content["hero.cta_secondary"],
        }}
      />

      {/* Bandeau de savoir-faire */}
      <section aria-label="Nos savoir-faire" className="border-y border-line py-5">
        <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="flex shrink-0 animate-[marquee_40s_linear_infinite] gap-12 pr-12 motion-reduce:animate-none">
            {[...Array(2)].flatMap((_, k) =>
              ["Trophées", "Médailles", "Gravure laser", "Impression UV", "Grand format", "Signalétique", "Cadeaux d'entreprise", "Objets personnalisés"].map((w) => (
                <span key={`${k}-${w}`} className="flex items-center gap-12 font-display text-2xl whitespace-nowrap text-mute italic md:text-3xl" aria-hidden={k === 1}>
                  {w}
                  <span className="size-1.5 rotate-45 bg-accent" aria-hidden />
                </span>
              )),
            )}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="container-x py-24 md:py-36">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="01 — Savoir-faire" title={content["home.services_title"]} />
          <Reveal>
            <ButtonLink href="/catalogue" variant="outline">Voir tout le catalogue</ButtonLink>
          </Reveal>
        </div>
        {services.length > 0 ? <ServiceCards categories={services} /> : <p className="text-mute">Le catalogue est momentanément indisponible.</p>}
      </section>

      {/* Fonctionnalité signature */}
      <section className="relative overflow-hidden border-y border-line bg-ink-900 py-24 md:py-36">
        <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" aria-hidden />
        <div className="container-x relative text-center">
          <SectionHeading align="center" eyebrow="02 — Donnez vie à votre idée" title={content["home.signature_title"]} body={content["home.signature_body"]} />
          <Reveal delay={0.15} className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-2">
            {PROJECT_TYPES.slice(0, 5).concat(PROJECT_TYPES.filter((p) => p.value === "objet")).map((t) => (
              <Link key={t.value} href={`/studio?type=${t.value}`} className="rounded-full border border-line-strong px-5 py-2.5 text-sm text-mute transition hover:border-accent hover:text-ink">
                {t.label}
              </Link>
            ))}
          </Reveal>
          <Reveal delay={0.25} className="mt-12">
            <MagneticButton href="/studio">Créer mon projet</MagneticButton>
          </Reveal>
        </div>
      </section>

      {/* Produits phares */}
      {featured && featured.data.length > 0 && (
        <section className="container-x py-24 md:py-36">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow="03 — Pièces phares" title="Les incontournables de l'atelier." />
            <Reveal>
              <ButtonLink href="/configurateur" variant="outline">Configurer en 3D</ButtonLink>
            </Reveal>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
            {featured.data.slice(0, 8).map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 0.06} className="w-[78vw] shrink-0 snap-start sm:w-[45vw] md:w-auto">
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Processus */}
      <section className="border-t border-line py-24 md:py-36">
        <div className="container-x">
          <SectionHeading eyebrow="04 — Comment ça marche" title="De l'idée à l'objet, en quatre temps." className="mb-20" />
          <ProcessSteps />
        </div>
      </section>

      {/* Réalisations */}
      {portfolio && portfolio.data.length > 0 && (
        <section className="container-x py-24 md:py-36">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow="05 — Réalisations" title={content["home.portfolio_title"]} />
            <Reveal>
              <ButtonLink href="/realisations" variant="outline">Toutes les réalisations</ButtonLink>
            </Reveal>
          </div>
          <div className="columns-2 gap-4 md:columns-3 [&>*]:mb-4">
            {portfolio.data.slice(0, 6).map((item, i) => (
              <Reveal key={item.id} delay={(i % 3) * 0.08}>
                <Link href="/realisations" className="group relative block overflow-hidden rounded-3xl border border-line">
                  <PortfolioThumb item={item} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 to-transparent p-5 pt-16">
                    <p className="font-mono text-[0.65rem] tracking-widest text-accent uppercase">{item.client_label}</p>
                    <p className="mt-1 text-paper-50">{item.title}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Trophée connecté */}
      <section className="border-y border-line bg-ink-900 py-24 md:py-32">
        <div className="container-x grid items-center gap-14 md:grid-cols-2">
          <SectionHeading eyebrow="06 — Trophées connectés" title={<>Un QR code gravé.<br />Une histoire qui <span className="metal-text italic">dure.</span></>} body="Chaque trophée peut recevoir un QR code unique. Scanné, il ouvre la page du lauréat : événement, année, message, photo — et un certificat d'authenticité vérifiable." />
          <Reveal delay={0.1}>
            <div className="relative mx-auto max-w-sm rounded-[2rem] border border-line-strong bg-canvas p-6 shadow-2xl">
              <div className="flex items-center justify-between font-mono text-[0.65rem] tracking-widest text-faint">
                <span>UNIVERS GRAVURE</span>
                <span>TROPHÉE #UG7K2M9P</span>
              </div>
              <BeamLine className="my-5" />
              <p className="eyebrow">Meilleur buteur · 2026</p>
              <p className="display mt-3 text-4xl text-ink">Kader B.</p>
              <p className="mt-2 text-sm text-mute">Tournoi inter-entreprises — 11 buts en 5 matchs.</p>
              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line p-4">
                <span className="grid size-14 grid-cols-4 gap-0.5 rounded bg-paper-50 p-1.5" aria-hidden>
                  {Array.from({ length: 16 }, (_, i) => <span key={i} className={[0, 1, 4, 6, 9, 10, 13, 15, 3, 12].includes(i) ? "bg-ink-950" : ""} />)}
                </span>
                <div className="text-sm">
                  <p className="text-ink">Certificat authentique</p>
                  <p className="font-mono text-xs text-success">✓ Empreinte vérifiée</p>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-faint">Exemple d&apos;affichage</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ + CTA final */}
      <section className="container-x grid gap-16 py-24 md:grid-cols-[1fr_1.3fr] md:py-36">
        <SectionHeading eyebrow="07 — Questions" title="Tout ce qu'il faut savoir avant de commander." />
        <Reveal delay={0.1}>
          <Accordion items={content.faq.length ? content.faq : FAQ} />
        </Reveal>
      </section>

      <section className="container-x pb-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-accent/30 bg-[radial-gradient(ellipse_at_top,rgba(212,175,106,.2),transparent_60%)] px-6 py-20 text-center md:py-28">
            <p className="eyebrow">Prêt à graver ?</p>
            <h2 className="display mx-auto mt-5 max-w-4xl text-[clamp(2.4rem,6vw,5.5rem)] text-ink">{content["home.cta_title"]}</h2>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <MagneticButton href="/studio">{content["hero.cta_primary"]}</MagneticButton>
              <ButtonLink href="/devis" variant="outline" size="lg">Demander un devis</ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
