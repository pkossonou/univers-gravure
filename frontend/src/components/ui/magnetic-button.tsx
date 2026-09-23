"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/lib/format";

/**
 * Bouton « magnétique » : attiré par le curseur (desktop uniquement).
 * Sur écran tactile ou en mouvement réduit, c'est un lien classique.
 */
export function MagneticButton({
  href,
  onClick,
  children,
  className,
  strength = 0.35,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const inner = cn(
    "group relative inline-flex h-16 items-center gap-3 overflow-hidden rounded-full bg-accent px-8 text-base font-semibold text-accent-ink",
    "shadow-[0_20px_60px_-20px_var(--accent)] transition-colors hover:bg-accent-strong",
    className,
  );
  const content = (
    <>
      <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/35 opacity-0 blur-md transition-all duration-700 group-hover:left-full group-hover:opacity-100" aria-hidden />
      <span className="relative flex items-center gap-3">{children}</span>
    </>
  );

  return (
    <motion.div ref={ref} style={{ x, y }} onPointerMove={onMove} onPointerLeave={reset} className="inline-block">
      {href ? (
        <Link href={href} className={inner}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={inner}>
          {content}
        </button>
      )}
    </motion.div>
  );
}
