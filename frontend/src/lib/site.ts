export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  /** URL de l'API côté serveur Next (peut différer : réseau interne) */
  serverApiUrl: process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  name: "UNIVERS GRAVURE",
  description:
    "Trophées, médailles, plaques, gravure laser, impression grand format et objets personnalisés. Atelier à Abidjan, livraison dans toute la Côte d'Ivoire.",
  city: "Abidjan",
  country: "Côte d'Ivoire",
};

export const NAV = [
  { href: "/realisations", label: "Réalisations" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/configurateur", label: "Configurateur" },
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/contact", label: "Contact" },
];

export const PROJECT_TYPES = [
  { value: "trophee", label: "Trophée", hint: "Coupes, étoiles, cristal" },
  { value: "medaille", label: "Médaille", hint: "Frappées, acryliques" },
  { value: "plaque", label: "Plaque", hint: "Honorifique, commémorative" },
  { value: "gravure", label: "Gravure", hint: "Sur objet, bois, métal" },
  { value: "impression", label: "Impression", hint: "Grand format, UV" },
  { value: "signaletique", label: "Signalétique", hint: "Plaques, lettres 3D" },
  { value: "objet", label: "Objet personnalisé", hint: "Mugs, textiles, goodies" },
  { value: "cadeau", label: "Cadeau d'entreprise", hint: "Coffrets, carnets" },
  { value: "autre", label: "Autre projet", hint: "Décrivez-le nous" },
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number]["value"];

/** Canal d'arrivée d'une demande (back-office). */
export const PROJECT_CHANNELS: Record<string, string> = {
  quote_form: "Formulaire devis", studio: "Studio", configurator: "Configurateur 3D", photo_model: "Photo d'un modèle",
  scan: "Scan", calculator: "Calculateur", contact: "Contact", admin: "Saisie équipe",
};

/** « +225 05 … / +225 07 … » → liste de numéros (plusieurs numéros séparés par / , ou ;). */
export function phoneList(value?: string | null): string[] {
  return (value ?? "").split(/[/,;]/).map((p) => p.trim()).filter(Boolean);
}

/** Lien de discussion WhatsApp (wa.me attend l'indicatif sans « + » ni espaces). */
export function whatsappLink(number?: string | null, text?: string): string | null {
  let digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.length === 10 && digits.startsWith("0")) digits = `225${digits}`; // numéro ivoirien saisi sans indicatif
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
