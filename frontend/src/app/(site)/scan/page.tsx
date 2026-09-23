import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";
import { ScanStudio } from "@/components/site/scan-studio";

export const metadata: Metadata = {
  title: "Scannez votre objet — simulation de gravure",
  description: "Photographiez un objet, placez votre texte ou votre logo et visualisez une simulation de gravure, d'impression ou de marquage.",
  alternates: { canonical: "/scan" },
};

export default function ScanPage() {
  return (
    <>
      <PageHeader eyebrow="Expérimental — Scan & personnalisation" title={<>Votre objet.<br /><span className="metal-text italic">Votre marque dessus.</span></>} body="Prenez une photo, choisissez gravure, impression ou marquage, placez votre texte ou votre logo. Nous vous disons ce qui est réalisable." />
      <section className="container-x pb-24">
        <ScanStudio />
      </section>
    </>
  );
}
