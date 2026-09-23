import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/site/page-header";
import { QuoteRequestForm } from "@/components/site/quote-request-form";

export const metadata: Metadata = {
  title: "Demander un devis",
  description: "Demande de devis en ligne pour vos trophées, médailles, plaques, gravures et impressions. Estimation immédiate, réponse de notre atelier d'Abidjan.",
  alternates: { canonical: "/devis" },
};

export default function QuotePage() {
  return (
    <>
      <PageHeader eyebrow="Demande de devis" title="Votre devis, sans détour." body="Huit étapes courtes. Une estimation qui se met à jour en direct. Un numéro de suivi dès l'envoi." />
      <section className="container-x pb-24">
        <Suspense>
          <QuoteRequestForm />
        </Suspense>
      </section>
    </>
  );
}
