import Link from "next/link";
import { BeamLine } from "@/components/ui/primitives";
import { getContent } from "@/lib/content";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Savoir-faire",
    links: [
      ["Trophées", "/catalogue/trophees"], ["Médailles", "/catalogue/medailles"], ["Plaques", "/catalogue/plaques"],
      ["Gravure", "/catalogue/gravure"], ["Impression", "/catalogue/impression"], ["Signalétique", "/catalogue/signaletique"],
    ],
  },
  {
    title: "Vos outils",
    links: [
      ["Créer mon projet", "/studio"], ["Configurateur 3D", "/configurateur"], ["Calculer mon projet", "/calculateur"],
      ["Scanner un objet", "/scan"], ["Demander un devis", "/devis"], ["Suivre ma demande", "/suivi"],
    ],
  },
  {
    title: "L'atelier",
    links: [["Réalisations", "/realisations"], ["Comment ça marche", "/comment-ca-marche"], ["Contact", "/contact"], ["Espace client", "/compte"]],
  },
];

export async function Footer() {
  const content = await getContent();
  return (
    <footer className="relative mt-24 border-t border-line bg-ink-950 pb-28 md:pb-0">
      <BeamLine />
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Logo variant="full" className="w-44" />
          <p className="mt-6 text-sm leading-relaxed text-mute">{content["footer.about"]}</p>
          <ul className="mt-5 space-y-1 text-sm text-mute">
            {content["company.phone"] && <li><a href={`tel:${content["company.phone"].replace(/\s/g, "")}`} className="hover:text-ink">{content["company.phone"]}</a></li>}
            {content["company.whatsapp"] && <li><a href={`https://wa.me/${content["company.whatsapp"].replace(/\D/g, "")}`} className="hover:text-ink" target="_blank" rel="noreferrer">WhatsApp {content["company.whatsapp"]}</a></li>}
            {content["company.email"] && <li><a href={`mailto:${content["company.email"]}`} className="hover:text-ink">{content["company.email"]}</a></li>}
            {content["company.address"] && <li>{content["company.address"]}</li>}
            {content["company.opening_hours"] && <li className="text-faint">{content["company.opening_hours"]}</li>}
          </ul>
          <p className="mt-6 font-mono text-xs tracking-[0.2em] text-faint">ABIDJAN · CÔTE D&apos;IVOIRE</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="eyebrow">{col.title}</p>
            <ul className="mt-5 flex flex-col gap-3">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-mute transition hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-x flex flex-col justify-between gap-3 border-t border-line py-6 text-xs text-faint md:flex-row">
        <p>© {new Date().getFullYear()} UNIVERS GRAVURE. Tous droits réservés.</p>
        <p className="font-mono tracking-wider">PRÉCISION · CRÉATIVITÉ · SAVOIR-FAIRE</p>
      </div>
    </footer>
  );
}
