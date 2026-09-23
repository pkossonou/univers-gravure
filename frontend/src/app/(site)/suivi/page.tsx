import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/site/page-header";
import { TrackingForm } from "@/components/site/tracking-form";

export const metadata: Metadata = {
  title: "Suivre ma demande",
  description: "Suivez l'avancement de votre demande UNIVERS GRAVURE : devis, validation, production, contrôle, remise.",
  robots: { index: false },
};

export default function TrackingPage() {
  return (
    <>
      <PageHeader eyebrow="Suivi" title="Où en est mon projet ?" body="Saisissez votre numéro de demande (DEM-…) et l'e-mail utilisé lors de l'envoi." />
      <section className="container-x pb-24">
        <Suspense>
          <TrackingForm />
        </Suspense>
      </section>
    </>
  );
}
