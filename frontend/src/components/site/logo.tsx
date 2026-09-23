/* eslint-disable @next/next/no-img-element -- logo vectorisé en WebP transparent, dimensions fixes (pas de décalage de mise en page) */
import { cn } from "@/lib/format";

/**
 * Logo officiel UNIVERS GRAVURE (fichiers dans /public/brand, générés depuis image/LOGO).
 *  - « emblem » : emblème + nom en texte, pour la navigation
 *  - « full »   : logo complet (intro, pied de page)
 */
export function Logo({ className, compact, variant = "emblem" }: { className?: string; compact?: boolean; variant?: "emblem" | "full" }) {
  if (variant === "full") {
    return <img src="/brand/logo.webp" alt="Univers Gravure" width={900} height={720} className={cn("h-auto w-40", className)} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-3 text-ink", className)}>
      <img src="/brand/emblem.webp" alt="" width={256} height={256} className="size-10 shrink-0" aria-hidden />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.05rem] tracking-[0.2em]">UNIVERS</span>
          <span className="mt-1 font-mono text-[0.62rem] tracking-[0.5em] text-accent">GRAVURE</span>
        </span>
      )}
    </span>
  );
}
