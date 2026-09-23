import "server-only";
import { serverApi } from "./server-api";

/** Textes du site, modifiables dans Back-office → Contenus du site. */
export interface SiteContent {
  "hero.eyebrow": string;
  "hero.title_1": string;
  "hero.title_2": string;
  "hero.title_3": string;
  "hero.subtitle": string;
  "hero.cta_primary": string;
  "hero.cta_secondary": string;
  "home.services_title": string;
  "home.signature_title": string;
  "home.signature_body": string;
  "home.portfolio_title": string;
  "home.cta_title": string;
  "footer.about": string;
  "contact.intro": string;
  faq: { q: string; a: string }[];
  "company.address"?: string | null;
  "company.phone"?: string | null;
  "company.email"?: string | null;
  "company.whatsapp"?: string | null;
  "company.opening_hours"?: string | null;
}

/** Repli si l'API est indisponible : le site reste lisible. */
const FALLBACK: SiteContent = {
  "hero.eyebrow": "Atelier de gravure & d'impression — Abidjan",
  "hero.title_1": "Nous donnons",
  "hero.title_2": "une forme",
  "hero.title_3": "à vos récompenses.",
  "hero.subtitle": "Trophées, gravure, impression et personnalisation sur tous supports.",
  "hero.cta_primary": "Créer mon projet",
  "hero.cta_secondary": "Découvrir nos réalisations",
  "home.services_title": "Tout ce qui se grave, s'imprime et se remet.",
  "home.signature_title": "Votre projet prend forme sous vos yeux.",
  "home.signature_body": "Choisissez ce que vous voulez créer. Le studio vous guide étape par étape, vous montre le rendu et calcule une estimation — sans engagement.",
  "home.portfolio_title": "La précision se voit de près.",
  "home.cta_title": "Parlez-nous de votre prochaine récompense.",
  "footer.about": "Trophées, médailles, gravure, impression et objets personnalisés. Conçus et fabriqués dans notre atelier d'Abidjan, livrés dans toute la Côte d'Ivoire.",
  "contact.intro": "Une question, un délai serré, un besoin particulier ? Écrivez-nous.",
  faq: [],
};

export async function getContent(): Promise<SiteContent> {
  const res = await serverApi<{ data: Partial<SiteContent> }>("/content", undefined, 60);
  return { ...FALLBACK, ...(res?.data ?? {}) };
}
