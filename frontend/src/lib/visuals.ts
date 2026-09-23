/** Visuels par défaut des univers (remplacés par category.image_url quand renseignée en back-office). */
export const CATEGORY_VISUALS: Record<string, [string, string]> = {
  trophees: ["/visuals/trophy-cup-gold.svg", "/visuals/trophy-star.svg"],
  medailles: ["/visuals/medal-gold.svg", "/visuals/medal-bronze.svg"],
  plaques: ["/visuals/plaque-wood.svg", "/visuals/plaque-brass.svg"],
  gravure: ["/visuals/wood-engraving.svg", "/visuals/bottle.svg"],
  impression: ["/visuals/banner.svg", "/visuals/rollup.svg"],
  signaletique: ["/visuals/letters-3d.svg", "/visuals/door-sign.svg"],
  "objets-personnalises": ["/visuals/mug.svg", "/visuals/keyring.svg"],
  "cadeaux-entreprise": ["/visuals/gift-box.svg", "/visuals/notebook.svg"],
  "supports-publicitaires": ["/visuals/stand.svg", "/visuals/beach-flag.svg"],
};

export function categoryVisual(slug: string, index = 0, imageUrl?: string | null): string {
  if (imageUrl && index === 0) return imageUrl;
  return CATEGORY_VISUALS[slug]?.[index] ?? "/visuals/trophy-cup-gold.svg";
}

export const PERSONALIZATION_LABELS: Record<string, string> = {
  gravure: "Gravure laser",
  impression: "Impression",
  uv: "Impression UV",
  sublimation: "Sublimation",
  marquage: "Marquage",
  broderie: "Broderie",
  decoupe: "Découpe",
};
