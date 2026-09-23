"use client";

import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";
import type { TrophyConfig } from "@/lib/trophy";

// Three.js n'est chargé que lorsque le composant est affiché (code splitting)
const TrophyScene = dynamic(() => import("./trophy-scene"), { ssr: false, loading: () => <ViewerLoading /> });

const FALLBACK_VISUAL: Record<string, string> = {
  cup: "/visuals/trophy-cup-gold.svg",
  star: "/visuals/trophy-star.svg",
  column: "/visuals/trophy-column.svg",
  crystal: "/visuals/crystal-award.svg",
  medal: "/visuals/medal-gold.svg",
  plaque: "/visuals/plaque-wood.svg",
};

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function ViewerLoading() {
  return (
    <div className="flex size-full items-center justify-center" role="status" aria-label="Chargement de l'aperçu 3D">
      <div className="h-px w-32 overflow-hidden bg-line">
        <div className="animate-beam h-full w-1/2 bg-accent" />
      </div>
    </div>
  );
}

/**
 * Aperçu 3D avec repli : image vectorielle + texte en surimpression si WebGL est indisponible
 * ou si l'appareil demande des économies de données.
 */
export function TrophyViewer({ config, className, interactive = true, autoRotate = true, distance }: { config: TrophyConfig; className?: string; interactive?: boolean; autoRotate?: boolean; distance?: number }) {
  const [mode, setMode] = useState<"pending" | "3d" | "2d">("pending");
  // Mouvement réduit : pas de rotation automatique (l’objet reste manipulable à la souris)
  const reduce = useReducedMotion();

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
    setMode(hasWebGL() && !nav.connection?.saveData ? "3d" : "2d");
  }, []);

  if (mode === "pending") return <div className={className}><ViewerLoading /></div>;

  if (mode === "2d") {
    return (
      <div className={cn("relative", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FALLBACK_VISUAL[config.shape] ?? FALLBACK_VISUAL.cup} alt="Aperçu du trophée" className="size-full object-contain" />
        <div className="absolute inset-x-0 bottom-[16%] text-center font-display text-lg text-brass-200" aria-live="polite">
          {config.engraving.lines.filter(Boolean).map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      </div>
    );
  }

  return <TrophyScene config={config} className={className} interactive={interactive} autoRotate={autoRotate && !reduce} distance={distance} />;
}
