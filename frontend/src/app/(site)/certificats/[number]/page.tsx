import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { date } from "@/lib/format";
import { serverApi } from "@/lib/server-api";
import { SITE } from "@/lib/site";

interface Certificate {
  number: string;
  recipient_name: string;
  award_title: string;
  event_name?: string | null;
  organization?: string | null;
  issued_on: string;
  is_authentic: boolean;
  is_revoked: boolean;
  trophy_code?: string | null;
}

export async function generateMetadata({ params }: PageProps<"/certificats/[number]">): Promise<Metadata> {
  const { number } = await params;
  return { title: `Certificat ${number.toUpperCase()}`, robots: { index: false } };
}

/** Vérification publique d'un certificat numérique (empreinte SHA-256 recalculée côté serveur). */
export default async function CertificatePage({ params }: PageProps<"/certificats/[number]">) {
  const { number } = await params;
  const res = await serverApi<{ data: Certificate }>(`/certificates/${encodeURIComponent(number)}`, undefined, 0);
  if (!res) notFound();
  const c = res.data;

  return (
    <section className="container-x flex min-h-dvh items-center justify-center pt-28 pb-16">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-accent/40 bg-[radial-gradient(ellipse_at_top,rgba(212,175,106,.12),transparent_60%)] p-8 text-center md:p-14">
        <p className="eyebrow">Certificat d&apos;authenticité</p>
        <div className="mt-6 flex justify-center">
          {c.is_revoked ? <Badge tone="danger" dot>Certificat révoqué</Badge> : c.is_authentic ? <Badge tone="success" dot>Authentique — empreinte vérifiée</Badge> : <Badge tone="danger" dot>Données non conformes</Badge>}
        </div>
        <p className="mt-10 text-sm text-mute">décerné à</p>
        <h1 className="display metal-text mt-2 text-[clamp(2.4rem,7vw,4.5rem)]">{c.recipient_name}</h1>
        <p className="mt-4 text-2xl text-ink">{c.award_title}</p>
        {c.event_name && <p className="mt-2 text-mute">{c.event_name}{c.organization ? ` · ${c.organization}` : ""}</p>}
        <dl className="mx-auto mt-10 grid max-w-md grid-cols-2 gap-4 border-t border-line pt-6 text-left text-sm">
          <div><dt className="font-mono text-[0.65rem] tracking-widest text-faint">NUMÉRO</dt><dd className="font-mono text-ink">{c.number}</dd></div>
          <div><dt className="font-mono text-[0.65rem] tracking-widest text-faint">DÉLIVRÉ LE</dt><dd className="text-ink">{date(c.issued_on)}</dd></div>
        </dl>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {!c.is_revoked && <ButtonLink href={`${SITE.apiUrl}/certificates/${c.number}/pdf`} variant="outline">Télécharger le PDF</ButtonLink>}
          {c.trophy_code && <ButtonLink href={`/t/${c.trophy_code}`} variant="ghost">Voir le trophée</ButtonLink>}
        </div>
        <p className="mt-10 text-xs text-faint">Émis par <Link href="/" className="underline underline-offset-4">UNIVERS GRAVURE</Link>. Toute modification des données certifiées invalide l&apos;empreinte.</p>
      </div>
    </section>
  );
}
