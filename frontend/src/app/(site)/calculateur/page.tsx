import type { Metadata } from "next";
import { Calculator } from "@/components/site/calculator";
import { PageHeader } from "@/components/site/page-header";

export const metadata: Metadata = {
  title: "Calculer mon projet — estimation en ligne",
  description: "Estimez le prix de vos trophées, médailles, gravures et impressions selon la quantité, les dimensions, le matériau, la finition et le délai.",
  alternates: { canonical: "/calculateur" },
};

export default function CalculatorPage() {
  return (
    <>
      <PageHeader eyebrow="Calculer mon projet" title={<>Une estimation, <span className="metal-text italic">maintenant.</span></>} body="Nos règles tarifaires réelles, appliquées à votre projet. Si un chiffrage précis est impossible, nous vous le disons honnêtement." />
      <section className="container-x pb-24">
        <Calculator />
      </section>
    </>
  );
}
