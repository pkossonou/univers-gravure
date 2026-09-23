"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/format";

/** Galerie produit : loupe au survol (desktop), vignettes, navigation clavier. */
export function ProductGallery({ images, name }: { images: { id: number; src: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const current = images[active];

  if (!current) {
    return <div className="flex aspect-[4/5] items-center justify-center rounded-3xl border border-line bg-surface text-mute">Visuel à venir</div>;
  }

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
      <div
        className="relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-3xl border border-line bg-surface"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onPointerLeave={() => setZoom(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => (a + 1) % images.length);
          if (e.key === "ArrowLeft") setActive((a) => (a - 1 + images.length) % images.length);
        }}
        tabIndex={images.length > 1 ? 0 : -1}
        role="img"
        aria-label={current.alt}
      >
          <motion.img
            key={current.id}
            src={current.src}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="size-full object-cover transition-transform duration-300"
            style={zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
      </div>
      {images.length > 1 && (
        <div className="flex gap-3" role="tablist" aria-label={`Images de ${name}`}>
          {images.map((img, i) => (
            <button
              key={img.id}
              role="tab"
              aria-selected={i === active}
              aria-label={`Image ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn("size-20 overflow-hidden rounded-xl border transition", i === active ? "border-accent" : "border-line opacity-60 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
