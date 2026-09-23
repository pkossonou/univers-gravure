"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/site/logo";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, initials, relative } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";
import type { Notification, Paginated } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  perm: string;
  icon: string;
}

/** Barre latérale groupée : Pilotage / Commercial / Atelier / Finances / Système. Filtrée par permission. */
export const ADMIN_NAV: { group: string; items: NavItem[] }[] = [
  { group: "Pilotage", items: [
    { href: "/admin", label: "Tableau de bord", perm: "dashboard.view", icon: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z" },
    { href: "/admin/finances", label: "Analyse financière", perm: "finance.view", icon: "M4 19V9M10 19V5M16 19v-7M22 19H2" },
    { href: "/admin/rapports", label: "Rapports", perm: "dashboard.view", icon: "M7 3h8l4 4v14H7zM11 12h6M11 16h6" },
  ] },
  { group: "Commercial", items: [
    { href: "/admin/clients", label: "Clients", perm: "clients.view", icon: "M16 19v-1a4 4 0 00-8 0v1M12 11a3 3 0 100-6 3 3 0 000 6z" },
    { href: "/admin/prospects", label: "Prospects", perm: "leads.view", icon: "M12 3v4M12 17v4M3 12h4M17 12h4M12 12h.01" },
    { href: "/admin/demandes", label: "Demandes", perm: "projects.view", icon: "M4 6h16M4 12h10M4 18h7" },
    { href: "/admin/devis", label: "Devis", perm: "quotes.view", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" },
    { href: "/admin/commandes", label: "Commandes", perm: "orders.view", icon: "M3 7h18l-2 11H5zM8 7V5a4 4 0 018 0v2" },
  ] },
  { group: "Atelier", items: [
    { href: "/admin/production", label: "Production", perm: "production.view", icon: "M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" },
    { href: "/admin/produits", label: "Produits", perm: "products.view", icon: "M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10" },
    { href: "/admin/categories", label: "Catégories & matières", perm: "products.view", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
    { href: "/admin/stock", label: "Stock", perm: "stock.view", icon: "M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4" },
    { href: "/admin/fournisseurs", label: "Fournisseurs & achats", perm: "suppliers.view", icon: "M3 17h13V6H3zM16 10h4l1 3v4h-5M7 20a2 2 0 100-4 2 2 0 000 4zM18 20a2 2 0 100-4 2 2 0 000 4z" },
  ] },
  { group: "Finances", items: [
    { href: "/admin/factures", label: "Factures", perm: "invoices.view", icon: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h3" },
    { href: "/admin/depenses", label: "Dépenses", perm: "expenses.view", icon: "M12 3v18M17 7H9.5a2.5 2.5 0 000 5h5a2.5 2.5 0 010 5H7" },
    { href: "/admin/revenus", label: "Revenus", perm: "revenues.view", icon: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  ] },
  { group: "Site web", items: [
    { href: "/admin/realisations", label: "Réalisations (photos, vidéos)", perm: "products.view", icon: "M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 9h.01" },
    { href: "/admin/contenus", label: "Contenus du site", perm: "settings.manage", icon: "M4 6h16M4 12h16M4 18h10" },
  ] },
  { group: "Objets connectés", items: [
    { href: "/admin/qr-codes", label: "QR Codes", perm: "qr_codes.view", icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2z" },
    { href: "/admin/certificats", label: "Certificats", perm: "qr_codes.view", icon: "M12 15a5 5 0 100-10 5 5 0 000 10zM9 14l-2 7 5-3 5 3-2-7" },
  ] },
  { group: "Système", items: [
    { href: "/admin/utilisateurs", label: "Utilisateurs", perm: "users.view", icon: "M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a3 3 0 100-6 3 3 0 000 6zM21 20v-1a4 4 0 00-3-3.9M16 5.1a3 3 0 010 5.8" },
    { href: "/admin/parametres", label: "Paramètres", perm: "settings.manage", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" },
  ] },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[18px] shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, can, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
  useEffect(() => setOpen(false), [pathname]);
  // Thème clair appliqué à <html> : les modales (portails) en héritent aussi
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "atelier-light");
    return () => document.documentElement.removeAttribute("data-theme");
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebar = (
    <nav aria-label="Back-office" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <Link href="/admin" className="px-3"><Logo className="text-paper-50" /></Link>
      {ADMIN_NAV.map((g) => {
        const items = g.items.filter((i) => can(i.perm));
        if (!items.length) return null;
        return (
          <div key={g.group}>
            <p className="mb-2 px-3 font-mono text-[0.62rem] tracking-[0.2em] text-steel-400/70 uppercase">{g.group}</p>
            <ul className="flex flex-col gap-0.5">
              {items.map((i) => {
                const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
                return (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition", active ? "bg-white/10 text-paper-50" : "text-steel-400 hover:bg-white/5 hover:text-paper-50")}>
                      <Icon d={i.icon} className={active ? "text-brass-400" : undefined} />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div className="mt-auto border-t border-white/10 px-3 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-brass-400 text-xs font-semibold text-ink-950">{initials(user?.name ?? "")}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-paper-50">{user?.name}</p>
            <p className="truncate font-mono text-[0.65rem] text-steel-400">{user?.roles.join(", ")}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-3 text-xs">
          <Link href="/" className="text-steel-400 hover:text-paper-50">Voir le site</Link>
          <button type="button" onClick={logout} className="text-steel-400 hover:text-paper-50">Déconnexion</button>
        </div>
      </div>
    </nav>
  );

  return (
    <div data-theme="atelier-light" className="min-h-dvh bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink-950 lg:block">{sidebar}</aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-72 bg-ink-950 lg:hidden" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.35 }}>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-xl md:px-8">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-mute hover:bg-raised lg:hidden" aria-label="Ouvrir la navigation">
            <Icon d="M4 7h16M4 12h16M4 17h16" />
          </button>
          <button type="button" onClick={() => setSearch(true)} className="flex h-10 flex-1 items-center gap-3 rounded-full border border-line bg-surface px-4 text-left text-sm text-faint transition hover:border-line-strong md:max-w-md">
            <Icon d="M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4" />
            Rechercher un client, un devis, une commande…
            <kbd className="ml-auto hidden rounded border border-line px-1.5 font-mono text-[0.65rem] md:inline">Ctrl K</kbd>
          </button>
          <Notifications />
        </header>
        <main id="contenu" className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useApi<Paginated<Notification>>("/notifications", { per_page: 12 });
  const readAll = useAction(() => api("/notifications/read-all", { method: "POST" }), { invalidate: ["/notifications"] });
  const read = useAction((id: string) => api(`/notifications/${id}/read`, { method: "POST" }), { invalidate: ["/notifications"] });
  const unread = Number(data?.meta.unread ?? 0);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`} className="relative rounded-full p-2.5 text-mute transition hover:bg-raised hover:text-ink">
        <Icon d="M6 16V11a6 6 0 1112 0v5l2 2H4zM10 21h4" />
        {unread > 0 && <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[0.6rem] text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line-strong bg-raised shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && <button type="button" onClick={() => readAll.mutate()} className="text-xs text-accent-strong">Tout marquer comme lu</button>}
          </div>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {data?.data.length ? data.data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read_at) read.mutate(n.id);
                    setOpen(false);
                    if (n.url) router.push(n.url);
                  }}
                  className={cn("flex w-full gap-3 px-4 py-3 text-left transition hover:bg-surface", !n.read_at && "bg-accent/5")}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-line-strong" : n.level === "warning" ? "bg-warning" : n.level === "success" ? "bg-success" : "bg-accent")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">{n.title}</span>
                    <span className="block truncate text-xs text-mute">{n.body}</span>
                    <span className="block font-mono text-[0.65rem] text-faint">{relative(n.created_at)}</span>
                  </span>
                </button>
              </li>
            )) : <li className="px-4 py-8 text-center text-sm text-mute">Aucune notification.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const router = useRouter();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(t);
  }, [q]);
  const { data, isFetching } = useApi<{ data: { type: string; label: string; hint?: string; url: string }[] }>(open && debounced.length >= 2 ? "/admin/search" : null, { q: debounced });
  const results = data?.data ?? [];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
    if (!open) setQ("");
    setIndex(0);
  }, [open, debounced]);

  if (!open) return null;
  const go = (url: string) => (router.push(url), onClose());

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Recherche globale">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-line-strong bg-raised shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") setIndex((i) => Math.min(results.length - 1, i + 1));
            if (e.key === "ArrowUp") setIndex((i) => Math.max(0, i - 1));
            if (e.key === "Enter" && results[index]) go(results[index].url);
          }}
          placeholder="Nom, e-mail, DEM-…, DEV-…, CMD-…"
          className="h-14 w-full border-b border-line bg-transparent px-5 text-ink outline-none placeholder:text-faint"
          aria-label="Rechercher"
        />
        <ul className="max-h-96 overflow-y-auto p-2" role="listbox">
          {isFetching && <li className="px-3 py-2 text-sm text-faint">Recherche…</li>}
          {!isFetching && debounced.length >= 2 && !results.length && <li className="px-3 py-6 text-center text-sm text-mute">Aucun résultat.</li>}
          {results.map((r, i) => (
            <li key={r.url} role="option" aria-selected={i === index}>
              <button type="button" onClick={() => go(r.url)} onMouseEnter={() => setIndex(i)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === index && "bg-surface")}>
                <span className="w-20 shrink-0 font-mono text-[0.65rem] tracking-widest text-faint uppercase">{r.type}</span>
                <span className="truncate text-sm text-ink">{r.label}</span>
                <span className="ml-auto truncate text-xs text-mute">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-mute">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
