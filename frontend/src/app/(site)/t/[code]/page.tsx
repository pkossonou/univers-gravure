import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeamLine } from "@/components/ui/primitives";
import { SITE } from "@/lib/site";

interface Trophy {
  code: string;
  type: string;
  title: string;
  recipient_name?: string | null;
  event_name?: string | null;
  year?: number | null;
  category_label?: string | null;
  organization?: string | null;
  message?: string | null;
  photo_url?: string | null;
  scans_count: number;
  certificate?: { number: string; verify_url: string } | null;
}

// Pas de cache : chaque scan est compté
async function getTrophy(code: string): Promise<Trophy | null> {
  try {
    const res = await fetch(`${SITE.serverApiUrl}/trophies/${encodeURIComponent(code)}`, { cache: "no-store", headers: { Accept: "application/json" } });
    return res.ok ? (await res.json()).data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps<"/t/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Trophée #${code.toUpperCase()}`, robots: { index: false } };
}

/** Page publique du trophée connecté (atteinte en scannant le QR code gravé). */
export default async function TrophyPage({ params }: PageProps<"/t/[code]">) {
  const { code } = await params;
  const t = await getTrophy(code);
  if (!t) notFound();

  return (
    <section className="relative flex min-h-dvh items-center overflow-hidden pt-28 pb-16">
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" aria-hidden />
      <div className="container-x relative mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-line-strong bg-surface/80 p-6 shadow-2xl backdrop-blur md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[0.68rem] tracking-[0.25em] text-faint">
            <span>UNIVERS GRAVURE</span>
            <span>TROPHÉE #{t.code}</span>
          </div>
          <BeamLine className="my-8" />
          <p className="eyebrow">{[t.category_label ?? t.title, t.year].filter(Boolean).join(" · ")}</p>
          {t.recipient_name && <h1 className="display mt-4 text-[clamp(2.6rem,8vw,5.5rem)] text-ink">{t.recipient_name}</h1>}
          {!t.recipient_name && <h1 className="display mt-4 text-5xl text-ink">{t.title}</h1>}
          {t.event_name && <p className="mt-4 text-xl text-mute">{t.event_name}</p>}
          {t.organization && <p className="mt-1 text-mute">Décerné par <span className="text-ink">{t.organization}</span></p>}
          {t.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.photo_url} alt={`Photo — ${t.recipient_name ?? t.title}`} className="mt-8 aspect-video w-full rounded-2xl object-cover" />
          )}
          {t.message && <blockquote className="display mt-8 border-l-2 border-accent pl-6 text-2xl text-ink italic">« {t.message} »</blockquote>}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            {t.certificate ? (
              <Link href={`/certificats/${t.certificate.number}`} className="text-sm text-success underline-offset-4 hover:underline">
                ✓ Certificat d&apos;authenticité {t.certificate.number}
              </Link>
            ) : (
              <span className="text-sm text-faint">Objet authentique UNIVERS GRAVURE</span>
            )}
            <span className="font-mono text-xs text-faint">{t.scans_count} consultation{t.scans_count > 1 ? "s" : ""}</span>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-mute">
          Vous aussi, offrez des trophées connectés. <Link href="/studio" className="text-accent-strong underline underline-offset-4">Créer mon projet</Link>
        </p>
      </div>
    </section>
  );
}
