import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { ProcessSteps } from "@/components/site/process-steps";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description: "Vous imaginez, nous concevons, nous fabriquons, vous recevez : le parcours d'un projet chez UNIVERS GRAVURE, de la demande au trophée livré.",
  alternates: { canonical: "/comment-ca-marche" },
};

const TOOLS = [
  { title: "Studio de projet", body: "Choisissez un univers, laissez-vous guider, obtenez une estimation.", href: "/studio" },
  { title: "Configurateur 3D", body: "Votre trophée évolue en direct : forme, matière, texte, logo.", href: "/configurateur" },
  { title: "Suivi en ligne", body: "Numéro de demande, devis, production : tout est visible.", href: "/suivi" },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader eyebrow="Comment ça marche" title={<>De l&apos;idée à l&apos;objet,<br /><span className="metal-text italic">sans surprise.</span></>} body="Un parcours clair en quatre temps. Notre équipe vous accompagne sur WhatsApp à chaque étape." />
      <section className="container-x py-12 md:py-20">
        <ProcessSteps />
      </section>
      <section className="container-x grid gap-4 py-16 md:grid-cols-3">
        {TOOLS.map((t, i) => (
          <Reveal key={t.href} delay={i * 0.08}>
            <Link href={t.href} className="group block h-full rounded-3xl border border-line bg-surface p-8 transition hover:border-accent/50">
              <p className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="display mt-4 text-3xl text-ink">{t.title}</h2>
              <p className="mt-3 text-mute">{t.body}</p>
              <p className="mt-8 text-sm text-accent-strong transition group-hover:translate-x-1">Essayer →</p>
            </Link>
          </Reveal>
        ))}
      </section>
      <section className="container-x pb-10 text-center">
        <ButtonLink href="/studio" size="lg">Commencer mon projet</ButtonLink>
      </section>
    </>
  );
}
