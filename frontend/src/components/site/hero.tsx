"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { TrophyViewer } from "@/components/three/trophy-viewer";
import { ButtonLink } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { DEFAULT_TROPHY } from "@/lib/trophy";

const ease = [0.22, 1, 0.36, 1] as const;

export interface HeroText {
  eyebrow: string;
  lines: [string, string, string];
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

export function Hero({ text }: { text: HeroText }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden pt-24 md:min-h-[100svh] md:pt-28 md:pb-10">
      {/* Décor : grille, halo laiton, repères */}
      <div className="grid-lines absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_60%_40%,black,transparent_75%)]" aria-hidden />
      <div className="absolute top-1/4 right-[8%] -z-10 size-[42rem] rounded-full bg-[radial-gradient(circle,rgba(212,175,106,.18),transparent_65%)] blur-2xl" aria-hidden />

      <div className="container-x grid items-center gap-6 md:min-h-[calc(100svh-9.5rem)] md:grid-cols-[1.1fr_1fr] md:gap-10">
        <motion.div style={{ y, opacity: fade }} className="order-2 pb-10 md:order-1 md:pb-0">
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            {text.eyebrow}
          </motion.p>
          <h1 className="display mt-5 text-[clamp(2.9rem,6.2vw,6.25rem)] text-ink">
            {text.lines.filter(Boolean).map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.08em]">
                <motion.span className={i === 2 ? "metal-text block italic" : "block"} initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.25 + i * 0.12, ease }}>
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="mt-6 max-w-lg text-lg leading-relaxed text-mute md:text-xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.8, ease }}>
            {text.subtitle}
          </motion.p>
          <motion.div className="mt-10 flex flex-wrap items-center gap-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8, ease }}>
            <MagneticButton href="/studio">
              {text.ctaPrimary}
              <svg viewBox="0 0 20 20" className="size-4 transition-transform group-hover:translate-x-1" aria-hidden>
                <path d="M4 10h11m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" />
              </svg>
            </MagneticButton>
            <ButtonLink href="/realisations" variant="outline" size="lg">
              {text.ctaSecondary}
            </ButtonLink>
          </motion.div>
          <motion.dl className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
            {[
              ["3D", "Configurateur en direct"],
              ["FCFA", "Estimation instantanée"],
              ["QR", "Trophées connectés"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-display text-2xl text-accent-strong">{k}</dt>
                <dd className="mt-1 text-xs leading-snug text-mute">{v}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <motion.div
          className="relative order-1 aspect-square w-full md:order-2 md:aspect-auto md:h-[72svh]"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.2, ease }}
        >
          <TrophyViewer config={DEFAULT_TROPHY} className="absolute inset-0" />
          {/* Cotes techniques autour de l'objet */}
          <div className="pointer-events-none absolute inset-y-[12%] right-2 hidden flex-col items-center justify-between md:flex" aria-hidden>
            <span className="h-px w-3 bg-accent/60" />
            <span className="font-mono text-[0.65rem] tracking-widest text-faint [writing-mode:vertical-rl]">H · 360 MM</span>
            <span className="h-px w-3 bg-accent/60" />
          </div>
          <p className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 font-mono text-[0.65rem] tracking-[0.3em] text-faint md:block" aria-hidden>
            DÉPLACEZ LA SOURIS — L&apos;OBJET RÉAGIT
          </p>
        </motion.div>
      </div>
    </section>
  );
}
