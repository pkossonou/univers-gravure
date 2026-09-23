import type { Metadata } from "next";
import { ModelRequest } from "@/components/site/model-request";
import { PageHeader } from "@/components/site/page-header";

export const metadata: Metadata = {
  title: "J'ai une photo du modèle — trophée ou plaque sur mesure",
  description: "Vous avez vu un trophée, une médaille ou une plaque qui vous plaît ? Envoyez la photo et vos précisions : UNIVERS GRAVURE le reproduit ou s'en inspire, à Abidjan.",
  alternates: { canonical: "/modele" },
};

export default function ModelPage() {
  return (
    <>
      <PageHeader
        eyebrow="J'ai une photo du modèle"
        title={<>Vous l&apos;avez vu ?<br /><span className="metal-text italic">Nous le fabriquons.</span></>}
        body="Pas besoin de concevoir : envoyez la photo du trophée, de la médaille ou de la plaque qui vous plaît, dites-nous ce que vous voulez garder ou changer. Nous vous répondons avec une proposition et un devis."
      />
      <section className="container-x pb-24">
        <ModelRequest />
      </section>
    </>
  );
}
