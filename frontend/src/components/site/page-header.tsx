import Link from "next/link";
import { Reveal } from "@/components/ui/primitives";

export function PageHeader({
  eyebrow,
  title,
  body,
  crumbs,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden pt-32 pb-14 md:pt-44 md:pb-20">
      <div className="grid-lines absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
      <div className="container-x">
        {crumbs && (
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-faint">
              <li><Link href="/" className="hover:text-ink">Accueil</Link></li>
              {crumbs.map((c) => (
                <li key={c.href} className="flex items-center gap-2">
                  <span aria-hidden>/</span>
                  <Link href={c.href} className="hover:text-ink">{c.label}</Link>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display mt-5 max-w-5xl text-[clamp(2.6rem,6.5vw,6rem)] text-ink">{title}</h1>
          {body && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mute">{body}</p>}
        </Reveal>
        {children}
      </div>
    </header>
  );
}
