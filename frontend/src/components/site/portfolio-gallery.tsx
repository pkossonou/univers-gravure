"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@/components/ui/primitives";
import type { PortfolioItem } from "@/lib/types";
import { PortfolioThumb } from "./portfolio-thumb";

const LABELS: Record<string, string> = {
  all: "Tout", trophees: "Trophées", medailles: "Médailles", plaques: "Plaques", gravure: "Gravure",
  impression: "Impression", evenements: "Événements", entreprises: "Entreprises", cadeaux: "Cadeaux personnalisés",
};

/** Galerie « masonry » : filtres animés, lightbox au clavier, vidéo et avant/après. */
export function PortfolioGallery({ items, categories }: { items: PortfolioItem[]; categories: string[] }) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const visible = filter === "all" ? items : items.filter((i) => i.category === filter);
  const current = open !== null ? visible[open] : null;

  const go = useCallback((delta: number) => setOpen((o) => (o === null ? o : (o + delta + visible.length) % visible.length)), [visible.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, go]);

  const tabs = ["all", ...categories].filter((c) => c === "all" || items.some((i) => i.category === c)).map((c) => ({ value: c, label: LABELS[c] ?? c, count: c === "all" ? items.length : items.filter((i) => i.category === c).length }));

  return (
    <>
      <Tabs tabs={tabs} value={filter} onChange={setFilter} className="mb-10 w-fit max-w-full" />
      <motion.div layout className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        <AnimatePresence mode="popLayout">
          {visible.map((item, i) => (
            <motion.button
              layout
              key={item.id}
              type="button"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setOpen(i)}
              className="group relative block w-full break-inside-avoid overflow-hidden rounded-3xl border border-line text-left"
              aria-label={`Agrandir : ${item.title}`}
            >
              <PortfolioThumb item={item} />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink-950/90 via-transparent to-transparent p-5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                <p className="font-mono text-[0.65rem] tracking-widest text-accent uppercase">{[LABELS[item.category], item.year].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 text-lg text-paper-50">{item.title}</p>
              </div>
              {(item.before_image_url || item.video_url) && (
                <span className="absolute top-4 right-4 rounded-full bg-ink-950/70 px-3 py-1 font-mono text-[0.6rem] tracking-widest text-brass-200 backdrop-blur">
                  {item.video_url ? "VIDÉO" : "AVANT / APRÈS"}
                </span>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {current && (
          <motion.div className="fixed inset-0 z-[95] flex flex-col bg-ink-950/95 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={current.title}>
            <div className="flex items-center justify-between px-4 py-4 md:px-8">
              <p className="font-mono text-xs tracking-widest text-steel-400">{String((open ?? 0) + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}</p>
              <button type="button" onClick={() => setOpen(null)} className="rounded-full border border-white/15 px-4 py-2 text-sm text-paper-50 hover:border-accent" autoFocus>Fermer</button>
            </div>
            <div className="relative flex flex-1 items-center justify-center px-4 md:px-20" onClick={() => setOpen(null)}>
              <motion.div key={current.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
                {current.video_url ? (
                  <video src={current.video_url} controls playsInline poster={current.image_url || undefined} className="max-h-[70vh] rounded-2xl" />
                ) : current.before_image_url ? (
                  <BeforeAfter before={current.before_image_url} after={current.image_url} alt={current.title} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.image_url} alt={current.title} className="max-h-[70vh] rounded-2xl object-contain" />
                )}
              </motion.div>
              <button type="button" aria-label="Précédente" onClick={(e) => (e.stopPropagation(), go(-1))} className="absolute left-2 size-12 rounded-full border border-white/15 text-paper-50 hover:border-accent md:left-6">←</button>
              <button type="button" aria-label="Suivante" onClick={(e) => (e.stopPropagation(), go(1))} className="absolute right-2 size-12 rounded-full border border-white/15 text-paper-50 hover:border-accent md:right-6">→</button>
            </div>
            <div className="px-4 pt-4 pb-10 text-center md:px-8">
              <p className="display text-2xl text-paper-50">{current.title}</p>
              <p className="mt-1 text-sm text-steel-400">{current.client_label}{current.description ? ` — ${current.description}` : ""}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function BeforeAfter({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative max-h-[70vh] overflow-hidden rounded-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`${alt} — après`} className="max-h-[70vh] object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt={`${alt} — avant`} className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="pointer-events-none absolute inset-y-0 w-px bg-brass-200" style={{ left: `${pos}%` }} />
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Comparer avant / après" className="absolute inset-x-6 bottom-4 accent-[var(--accent)]" />
    </div>
  );
}
