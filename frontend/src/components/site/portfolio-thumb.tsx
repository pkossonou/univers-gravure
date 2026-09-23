/* eslint-disable @next/next/no-img-element -- médias envoyés depuis le back-office, servis par l'API */
import { cn } from "@/lib/format";
import type { PortfolioItem } from "@/lib/types";

const RATIO = { portrait: "aspect-[4/5]", landscape: "aspect-[4/3]", square: "aspect-square" };

/** Vignette de réalisation : photo, ou vidéo muette si aucune photo n'a été fournie. */
export function PortfolioThumb({ item, className }: { item: PortfolioItem; className?: string }) {
  const cls = cn("w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-signature)] group-hover:scale-105", RATIO[item.ratio], className);
  if (!item.image_url && item.video_url) {
    return <video src={`${item.video_url}#t=0.5`} muted playsInline preload="metadata" aria-label={item.title} className={cls} />;
  }
  return <img src={item.image_url} alt={item.title} loading="lazy" className={cls} />;
}
