"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const KEY = "ug_intro_seen";

/**
 * Intro : un faisceau laiton balaie et « grave » le logo, puis s'efface (≤ 1,8 s).
 * Jouée une fois par session, passable au clic/touche, jamais sur mouvement réduit,
 * économie de données ou petit appareil peu puissant. Le contenu reste rendu dessous.
 */
export function Intro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* stockage indisponible : on joue l'intro */
    }
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowEnd = window.innerWidth < 768 && ((nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 2);
    if (seen || reduce || nav.connection?.saveData || lowEnd) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
    setShow(true);
    const done = setTimeout(() => setShow(false), 1800);
    const skip = () => setShow(false);
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      clearTimeout(done);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[200] flex cursor-pointer items-center justify-center bg-ink-950"
          exit={{ clipPath: "inset(0 0 100% 0)", transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
          onClick={() => setShow(false)}
          aria-hidden
        >
          <div className="relative">
            <motion.div
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0.15 }}
              className="flex flex-col items-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- logo officiel révélé par le faisceau */}
              <img src="/brand/logo.webp" alt="" width={900} height={720} className="h-auto w-56 md:w-80" />
            </motion.div>
            {/* Le faisceau qui grave */}
            <motion.span
              className="absolute top-[-20%] h-[140%] w-[2px] bg-brass-200 shadow-[0_0_24px_6px_rgba(242,221,168,.55)]"
              initial={{ left: "0%", opacity: 0 }}
              animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0.15 }}
            />
          </div>
          <span className="absolute bottom-8 font-mono text-[0.65rem] tracking-[0.3em] text-steel-400">CLIQUEZ POUR PASSER</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
