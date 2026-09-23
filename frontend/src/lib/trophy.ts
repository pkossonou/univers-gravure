import type { Model3D } from "./types";

/** État complet d'un trophée configuré — partagé par le configurateur, le studio et l'aperçu 3D. */
export interface TrophyConfig {
  shape: Model3D;
  metal: MetalKey;
  finish: FinishKey;
  base: BaseKey;
  /** Facteur d'échelle visuel (1 = taille S) */
  scale: number;
  engraving: Engraving;
  /** URL locale (objet blob) du logo pour l'aperçu */
  logoUrl?: string | null;
}

export interface Engraving {
  lines: string[];
  font: "serif" | "sans" | "mono";
  color: string;
  align: "left" | "center" | "right";
  size: number;
  placement: "socle" | "face";
}

export type MetalKey = "gold" | "silver" | "bronze" | "black" | "crystal";
export type FinishKey = "brillant" | "satine" | "mat" | "miroir";
export type BaseKey = "marbre" | "bois" | "aucun";

export const METALS: Record<MetalKey, { label: string; color: string; swatch: string; materialSlug?: string }> = {
  gold: { label: "Or", color: "#D4AF6A", swatch: "linear-gradient(135deg,#FBE7B0,#C9A45C,#8E6A2C)", materialSlug: "laiton" },
  silver: { label: "Argent", color: "#D9DCE1", swatch: "linear-gradient(135deg,#fff,#B8BCC4,#6A6F77)", materialSlug: "aluminium-brosse" },
  bronze: { label: "Bronze", color: "#B0703E", swatch: "linear-gradient(135deg,#F4C9A0,#A8683A,#5a3317)", materialSlug: "laiton" },
  black: { label: "Noir", color: "#1E1E22", swatch: "linear-gradient(135deg,#4a4a52,#1a1a1d)", materialSlug: "acier-inoxydable" },
  crystal: { label: "Cristal", color: "#EAF4FA", swatch: "linear-gradient(135deg,#fff,#CFE3EE,#7FA6BD)", materialSlug: "cristal-optique" },
};

export const FINISHES: Record<FinishKey, { label: string; roughness: number; finishSlug?: string }> = {
  miroir: { label: "Miroir", roughness: 0.04, finishSlug: "effet-miroir" },
  brillant: { label: "Brillant", roughness: 0.16, finishSlug: "or-brillant" },
  satine: { label: "Satiné", roughness: 0.34, finishSlug: "argent-satine" },
  mat: { label: "Mat", roughness: 0.62, finishSlug: "noir-mat" },
};

export const BASES: Record<BaseKey, { label: string; color: string }> = {
  marbre: { label: "Marbre noir", color: "#141416" },
  bois: { label: "Bois acajou", color: "#5A2E18" },
  aucun: { label: "Sans socle", color: "#000" },
};

export const SHAPES: { value: Model3D; label: string; hint: string }[] = [
  { value: "cup", label: "Coupe", hint: "La victoire classique" },
  { value: "star", label: "Étoile", hint: "Pour les meilleurs éléments" },
  { value: "column", label: "Colonne", hint: "Modulable, idéale en série" },
  { value: "crystal", label: "Cristal", hint: "Gravure en profondeur" },
  { value: "medal", label: "Médaille", hint: "Frappée, avec ruban" },
  { value: "plaque", label: "Plaque", hint: "Honorifique" },
];

export const FONTS: Record<Engraving["font"], { label: string; cssVar: string; fallback: string }> = {
  serif: { label: "Classique", cssVar: "--font-fraunces", fallback: "Georgia, serif" },
  sans: { label: "Moderne", cssVar: "--font-manrope", fallback: "Arial, sans-serif" },
  mono: { label: "Technique", cssVar: "--font-jetbrains", fallback: "monospace" },
};

export const DEFAULT_TROPHY: TrophyConfig = {
  shape: "cup",
  metal: "gold",
  finish: "brillant",
  base: "marbre",
  scale: 1,
  engraving: { lines: ["CHAMPION 2026", "Tournoi d'Abidjan"], font: "serif", color: "#2A1E0A", align: "center", size: 1, placement: "socle" },
};
