"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { Reveal } from "@/components/ui/primitives";
import type { Category } from "@/lib/types";
import { categoryVisual } from "@/lib/visuals";

/**
 * Carte de service interactive : inclinaison 3D suivant le curseur, bascule d'image,
 * apparition de la description. Au clavier / tactile : description toujours lisible.
 */
function ServiceCard({ category, index }: { category: Category; index: number }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 200, damping: 20 });

  return (
    <Reveal delay={(index % 4) * 0.06}>
      <motion.div
        style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width);
          my.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => (mx.set(0.5), my.set(0.5))}
        className="group relative"
      >
        <Link
          href={`/catalogue/${category.slug}`}
          className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl border border-line bg-surface p-6 transition-colors duration-500 hover:border-accent/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={categoryVisual(category.slug, 0, category.image_url)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-all duration-700 ease-[var(--ease-signature)] group-hover:scale-110 group-hover:opacity-0" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={categoryVisual(category.slug, 1)} alt="" loading="lazy" className="absolute inset-0 size-full scale-110 object-cover opacity-0 transition-all duration-700 ease-[var(--ease-signature)] group-hover:scale-100 group-hover:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
          <span className="absolute top-5 left-6 font-mono text-xs text-accent">{String(index + 1).padStart(2, "0")}</span>
          <span className="absolute top-5 right-5 flex size-10 items-center justify-center rounded-full border border-white/15 text-paper-50 transition-all duration-500 group-hover:rotate-[-45deg] group-hover:border-accent group-hover:bg-accent group-hover:text-ink-950" aria-hidden>
            →
          </span>
          <div className="relative [transform:translateZ(40px)]">
            <h3 className="display text-3xl text-paper-50 transition-transform duration-500 group-hover:-translate-y-1">{category.name}</h3>
            <p className="mt-2 max-h-24 text-sm text-steel-400 transition-all duration-500 md:max-h-0 md:opacity-0 md:group-hover:max-h-24 md:group-hover:opacity-100 md:group-focus-visible:max-h-24 md:group-focus-visible:opacity-100">
              {category.tagline}
            </p>
          </div>
        </Link>
      </motion.div>
    </Reveal>
  );
}

export function ServiceCards({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((c, i) => (
        <ServiceCard key={c.id} category={c} index={i} />
      ))}
    </div>
  );
}
