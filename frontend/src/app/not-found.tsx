import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" aria-hidden />
      <Link href="/" className="relative mb-16" aria-label="Accueil">
        <Logo />
      </Link>
      <p className="relative font-mono text-sm tracking-[0.3em] text-accent">ERREUR 404</p>
      <h1 className="display relative mt-6 text-[clamp(3rem,10vw,8rem)] text-ink">
        Rien de <span className="metal-text italic">gravé</span> ici.
      </h1>
      <p className="relative mt-6 max-w-md text-mute">Cette page n&apos;existe pas ou a été déplacée. Le catalogue et le studio, eux, sont toujours là.</p>
      <div className="relative mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Retour à l&apos;accueil</ButtonLink>
        <ButtonLink href="/catalogue" variant="outline">Voir le catalogue</ButtonLink>
      </div>
    </main>
  );
}
