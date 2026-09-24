"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/format";
import { NAV, SITE } from "@/lib/site";
import { Logo } from "./logo";

export function Navbar() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const { user } = useAuth();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(y > 400 && y > prev && !menu);
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
  }, [menu]);

  // Pas d'espace client : seul un membre de l'équipe connecté voit un raccourci vers l'administration
  const staff = !!user?.is_staff;

  return (
    <>
      <a href="#contenu" className="sr-only z-[120] rounded bg-accent px-4 py-2 text-accent-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
        Aller au contenu
      </a>
      <motion.header
        animate={{ y: hidden ? -96 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn("fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-300", menu ? "border-b border-white/5 bg-ink-950" : scrolled ? "border-b border-white/5 bg-ink-950/70 backdrop-blur-xl" : "border-b border-transparent")}
      >
        <div className="container-x flex h-18 items-center justify-between gap-6 py-3">
          <Link href="/" aria-label={`${SITE.name} — accueil`}>
            <Logo />
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("group relative px-4 py-2 text-sm transition-colors", active ? "text-ink" : "text-mute hover:text-ink")}>
                  {item.label}
                  <span className={cn("absolute inset-x-4 -bottom-0.5 h-px origin-left bg-accent transition-transform duration-500 ease-[var(--ease-signature)]", active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")} />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {staff && (
              <Link href="/admin" className="hidden rounded-full px-4 py-2 text-sm text-mute transition hover:text-ink md:inline-flex">
                Administration
              </Link>
            )}
            <ButtonLink href="/studio" size="sm" className="hidden sm:inline-flex">
              Créer mon projet
            </ButtonLink>
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-controls="menu-mobile"
              aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"}
              className="relative flex size-11 items-center justify-center rounded-full border border-line-strong lg:hidden"
            >
              <span className={cn("absolute h-px w-5 bg-ink transition-transform duration-300", menu ? "rotate-45" : "-translate-y-1")} />
              <span className={cn("absolute h-px w-5 bg-ink transition-transform duration-300", menu ? "-rotate-45" : "translate-y-1")} />
            </button>
          </div>
        </div>
      </motion.header>

      <MobileMenu open={menu} staff={staff} />
    </>
  );
}

function MobileMenu({ open, staff }: { open: boolean; staff: boolean }) {
  const links = [...NAV, { href: "/calculateur", label: "Calculer mon projet" }, { href: "/modele", label: "J'ai une photo du modèle" }, { href: "/scan", label: "Scanner un objet" }, { href: "/suivi", label: "Suivre ma demande" }];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="menu-mobile"
          className="grain fixed inset-0 z-[45] flex flex-col overflow-y-auto overscroll-contain bg-ink-950 px-6 pt-24 pb-10 lg:hidden"
          initial={{ clipPath: "circle(0% at calc(100% - 44px) 36px)" }}
          animate={{ clipPath: "circle(150% at calc(100% - 44px) 36px)", transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
          exit={{ clipPath: "circle(0% at calc(100% - 44px) 36px)", transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] } }}
        >
          <nav aria-label="Menu mobile" className="flex flex-1 flex-col gap-1">
            {links.map((l, i) => (
              <motion.div key={l.href} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.04 } }}>
                <Link href={l.href} className="flex items-baseline gap-4 border-b border-line py-3">
                  <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <span className="display text-2xl text-ink">{l.label}</span>
                </Link>
              </motion.div>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <ButtonLink href="/studio" size="lg">Créer mon projet</ButtonLink>
            <ButtonLink href={staff ? "/admin" : "/contact"} size="lg" variant="outline">{staff ? "Administration" : "Nous contacter"}</ButtonLink>
            {!staff && (
              <Link href="/connexion" className="mt-1 py-2 text-center text-sm text-faint underline-offset-4 hover:text-ink hover:underline">
                Espace équipe
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Barre d'action mobile : 4 gestes essentiels à portée de pouce. */
export function MobileDock() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Accueil", icon: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
    { href: "/catalogue", label: "Catalogue", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
    { href: "/studio", label: "Créer", icon: "M12 5v14M5 12h14", primary: true },
    { href: "/realisations", label: "Réalisations", icon: "M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4" },
    { href: "/contact", label: "Contact", icon: "M4 5h16v11H8l-4 4zM8 10h8M8 13h5" },
  ];
  return (
    <nav aria-label="Accès rapide" className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-white/10 bg-ink-900/85 p-1.5 shadow-2xl backdrop-blur-xl md:hidden" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <li key={it.label}>
              <Link href={it.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 rounded-xl py-1.5 text-[0.65rem]", it.primary ? "text-accent-ink" : active ? "text-ink" : "text-faint")}>
                <span className={cn("flex size-9 items-center justify-center rounded-xl", it.primary && "bg-accent shadow-[0_8px_24px_-8px_var(--accent)]")}>
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={it.icon} />
                  </svg>
                </span>
                <span className={it.primary ? "text-accent-strong" : undefined}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
