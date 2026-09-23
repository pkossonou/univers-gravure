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
