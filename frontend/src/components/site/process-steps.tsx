"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/format";

export const PROCESS = [
  { n: "01", title: "Vous imaginez", body: "Décrivez votre idée, configurez votre trophée en 3D ou envoyez simplement votre logo. Une estimation s'affiche immédiatement.", detail: "Studio en ligne · Estimation instantanée" },
  { n: "02", title: "Nous concevons", body: "Notre équipe prépare le fichier, choisit les matières et vous envoie un BAT et un devis détaillé à valider.", detail: "BAT à valider · Devis en ligne" },
  { n: "03", title: "Nous fabriquons", body: "Gravure laser, impression UV, assemblage et finitions : chaque étape est suivie et contrôlée à l'atelier.", detail: "Suivi en temps réel · Contrôle qualité" },
  { n: "04", title: "Vous recevez", body: "Retrait à l'atelier ou livraison à Abidjan et dans toute la Côte d'Ivoire. Vos trophées peuvent devenir connectés.", detail: "Livraison · QR code & certificat" },
];

/** Parcours en 4 temps : le faisceau progresse avec le défilement. */
export function ProcessSteps({ compact }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative">
      <div className="absolute top-0 bottom-0 left-[1.1rem] w-px bg-line md:left-1/2" aria-hidden>
        <motion.div style={{ height }} className="w-px bg-gradient-to-b from-brass-200 via-accent to-accent shadow-[0_0_12px_var(--accent)]" />
      </div>
      <ol className="flex flex-col gap-14 md:gap-24">
        {PROCESS.map((step, i) => (
          <motion.li
            key={step.n}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={cn("relative grid gap-4 pl-12 md:grid-cols-2 md:gap-24 md:pl-0", i % 2 === 1 && "md:[&>div:first-child]:order-2")}
          >
            <span className="absolute top-2 left-0 flex size-9 items-center justify-center rounded-full border border-accent bg-canvas font-mono text-xs text-accent-strong md:left-1/2 md:-translate-x-1/2" aria-hidden>
              {step.n}
            </span>
            <div className={cn(i % 2 === 0 ? "md:text-right" : "")}>
              <p className="display text-[clamp(3rem,8vw,7rem)] leading-none text-line-strong">{step.n}</p>
            </div>
            <div>
              <h3 className="display text-3xl text-ink md:text-4xl">{step.title}</h3>
              <p className={cn("mt-3 max-w-md leading-relaxed text-mute", compact && "text-sm")}>{step.body}</p>
              <p className="mt-4 font-mono text-xs tracking-[0.18em] text-accent uppercase">{step.detail}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
