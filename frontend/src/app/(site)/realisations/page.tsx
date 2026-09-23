import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";
import { PortfolioGallery } from "@/components/site/portfolio-gallery";
import { EmptyState } from "@/components/ui/primitives";
import { serverApi } from "@/lib/server-api";
import type { PortfolioItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Réalisations — trophées, médailles, gravure et impression",
  description: "Découvrez les réalisations de l'atelier UNIVERS GRAVURE : trophées, médailles, plaques, gravure, impression, événements et cadeaux d'entreprise.",
  alternates: { canonical: "/realisations" },
};

export default async function PortfolioPage() {
  const res = await serverApi<{ data: PortfolioItem[]; categories: string[] }>("/portfolio", undefined, 300);
  return (
    <>
      <PageHeader eyebrow="Réalisations" title={<>Des pièces qui <span className="metal-text italic">restent.</span></>} body="Trophées, plaques et distinctions sortis de notre atelier d’Abidjan : un aperçu de nos réalisations pour les entreprises, les institutions et les événements." />
      <section className="container-x pb-24">
        {res && res.data.length > 0 ? (
          <PortfolioGallery items={res.data} categories={res.categories} />
        ) : (
          <EmptyState title="La galerie est en cours de préparation" body="Revenez bientôt, ou demandez-nous des exemples adaptés à votre projet." />
        )}
      </section>
    </>
  );
}
