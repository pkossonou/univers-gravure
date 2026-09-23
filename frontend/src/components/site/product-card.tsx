import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, fcfa } from "@/lib/format";
import type { Product } from "@/lib/types";

export function priceLabel(p: Product): string {
  if (p.price.on_quote || p.price.from === null) return "Sur devis";
  return `Dès ${fcfa(p.price.from)}${p.price.unit === "area" ? " / m²" : ""}`;
}

export function ProductCard({ product, className, priority }: { product: Product; className?: string; priority?: boolean }) {
  const image = product.images?.[0];
  return (
    <Link href={`/produits/${product.slug}`} className={cn("group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-colors duration-500 hover:border-accent/50", className)}>
      <div className="relative aspect-[4/5] overflow-hidden bg-raised">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.src} alt={image.alt} loading={priority ? "eager" : "lazy"} className="size-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-signature)] group-hover:scale-105" />
        )}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {product.is_configurable && <Badge tone="accent">3D</Badge>}
          {product.availability === "in_stock" && <Badge tone="success">En stock</Badge>}
        </div>
        <span className="absolute right-4 bottom-4 font-mono text-[0.65rem] tracking-widest text-steel-400">{product.reference}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <p className="font-mono text-[0.68rem] tracking-[0.16em] text-faint uppercase">{product.category?.name}</p>
        <h3 className="text-lg font-semibold text-ink transition-colors group-hover:text-accent-strong">{product.name}</h3>
        {product.short_description && <p className="line-clamp-2 text-sm text-mute">{product.short_description}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-sm font-medium text-ink">{priceLabel(product)}</span>
          <span className="font-mono text-xs text-faint">
            {product.lead_time.min}–{product.lead_time.max} j
          </span>
        </div>
      </div>
    </Link>
  );
}
