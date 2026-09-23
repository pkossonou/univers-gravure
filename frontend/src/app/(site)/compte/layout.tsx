"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/compte", label: "Vue d'ensemble" },
  { href: "/compte/demandes", label: "Mes demandes" },
  { href: "/compte/devis", label: "Devis" },
  { href: "/compte/commandes", label: "Commandes" },
  { href: "/compte/factures", label: "Factures" },
  { href: "/compte/fichiers", label: "Fichiers" },
  { href: "/compte/profil", label: "Profil" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AccountShell>{children}</AccountShell>
    </AuthGuard>
  );
}

function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (user?.is_staff) {
    return (
      <section className="container-x flex min-h-[70dvh] flex-col items-center justify-center gap-4 pt-28 text-center">
        <p className="text-mute">Vous êtes connecté avec un compte de l&apos;équipe.</p>
        <ButtonLink href="/admin">Ouvrir le back-office</ButtonLink>
      </section>
    );
  }

  return (
    <div className="container-x pt-28 pb-16 md:pt-36">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Espace client</p>
          <h1 className="display mt-3 text-4xl text-ink md:text-5xl">Bonjour {user?.name.split(" ")[0]}.</h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/studio" size="sm">Nouveau projet</ButtonLink>
          <button type="button" onClick={logout} className="rounded-full px-4 text-sm text-mute hover:text-ink">Se déconnecter</button>
        </div>
      </div>
      <nav aria-label="Espace client" className="-mx-4 mb-10 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-1 border-b border-line">
          {NAV.map((n) => {
            const active = n.href === "/compte" ? pathname === "/compte" : pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("relative block px-4 py-3 text-sm transition", active ? "text-ink" : "text-mute hover:text-ink")}>
                  {n.label}
                  {active && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
