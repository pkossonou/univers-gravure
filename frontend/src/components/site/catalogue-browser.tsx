"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Drawer } from "@/components/ui/overlay";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { cn, fcfa } from "@/lib/format";
import type { Paginated, Product } from "@/lib/types";
import { ProductCard } from "./product-card";

interface Facet {
  id?: number;
  name: string;
  slug: string;
  products_count?: number;
  color_hex?: string | null;
}

export interface CatalogFilters {
  categories: Facet[];
  materials: Facet[];
  usages: Facet[];
  events: Facet[];
  personalizations: Facet[];
  price: { min: number; max: number };
}

const MULTI_KEYS = ["category", "material", "personalization", "usage", "event", "availability"] as const;
const SORTS = [
  { value: "popular", label: "Les plus demandés" },
  { value: "newest", label: "Nouveautés" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "name", label: "Nom (A → Z)" },
];

/** Catalogue : filtres synchronisés dans l'URL (partageables, indexables), recherche instantanée. */
export function CatalogueBrowser({ filters, lockedCategory, initial }: { filters: CatalogFilters | null; lockedCategory?: string; initial?: Paginated<Product> | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [drawer, setDrawer] = useState(false);

  const query = useMemo(() => {
    const q: Record<string, string> = {};
    params.forEach((v, k) => (q[k] = v));
    if (lockedCategory) q.category = lockedCategory;
    return q;
  }, [params, lockedCategory]);

  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };
  const setParam = (key: string, value: string | null) => setParams({ [key]: value });

  const toggle = (key: string, slug: string) => {
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
    setParam(key, next.join(",") || null);
  };

  useEffect(() => {
    const t = setTimeout(() => (params.get("search") ?? "") !== search && setParam("search", search || null), 250);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const isInitialQuery = Object.keys(query).filter((k) => k !== "category").length === 0;
  const result = useInfiniteQuery({
    queryKey: ["catalog", query],
    queryFn: ({ pageParam }) => api<Paginated<Product>>("/catalog/products", { query: { ...query, page: pageParam, per_page: 12 } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
    initialData: initial && isInitialQuery ? { pages: [initial], pageParams: [1] } : undefined,
    placeholderData: keepPreviousData,
  });

  const products = result.data?.pages.flatMap((p) => p.data) ?? [];
  const total = result.data?.pages[0]?.meta.total ?? 0;
  const activeCount = MULTI_KEYS.reduce((n, k) => n + (k === "category" && lockedCategory ? 0 : (params.get(k) ?? "").split(",").filter(Boolean).length), 0) + (params.get("price_max") ? 1 : 0);

  const panel = (
    <FilterPanel filters={filters} params={params} toggle={toggle} setParams={setParams} lockedCategory={lockedCategory} />
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block" aria-label="Filtres">
        <div className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2">{panel}</div>
      </aside>

      <div>
        <div className="sticky top-18 z-20 -mx-4 mb-8 flex flex-wrap items-center gap-3 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="relative min-w-0 flex-1">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un trophée, une médaille, un matériau…" aria-label="Rechercher dans le catalogue" className="pl-11" type="search" />
            <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" aria-hidden>
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <Button variant="secondary" className="lg:hidden" onClick={() => setDrawer(true)}>
            Filtres{activeCount > 0 && <span className="rounded-full bg-accent px-1.5 font-mono text-xs text-accent-ink">{activeCount}</span>}
          </Button>
          <div className="w-full sm:w-56">
            <Select value={params.get("sort") ?? "popular"} onChange={(e) => setParam("sort", e.target.value === "popular" ? null : e.target.value)} aria-label="Trier">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <p className="mb-6 font-mono text-xs tracking-[0.18em] text-faint uppercase" aria-live="polite">
          {result.isFetching && !result.isFetchingNextPage ? "Recherche…" : `${total} produit${total > 1 ? "s" : ""}`}
        </p>

        {result.isError ? (
          <ErrorState onRetry={() => result.refetch()} />
        ) : result.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-line">
                <Skeleton className="aspect-[4/5] rounded-none" />
                <div className="space-y-2 p-5"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-5 w-2/3" /></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="Aucun produit ne correspond"
            body="Élargissez vos filtres, ou décrivez-nous votre projet : nous fabriquons aussi sur mesure."
            action={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => router.replace(pathname)}>Réinitialiser</Button>
                <Button onClick={() => router.push("/studio")}>Projet sur mesure</Button>
              </div>
            }
          />
        ) : (
          <div className={cn("grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3", result.isFetching && !result.isFetchingNextPage && "opacity-60")}>
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 3} />
            ))}
          </div>
        )}

        {result.hasNextPage && (
          <div className="mt-10 flex justify-center">
            <Button variant="outline" loading={result.isFetchingNextPage} onClick={() => result.fetchNextPage()}>
              Afficher plus de produits
            </Button>
          </div>
        )}
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filtrer le catalogue" footer={<Button onClick={() => setDrawer(false)}>Voir {total} produit{total > 1 ? "s" : ""}</Button>}>
        {panel}
      </Drawer>
    </div>
  );
}

function FilterPanel({
  filters,
  params,
  toggle,
  setParams,
  lockedCategory,
}: {
  filters: CatalogFilters | null;
  params: URLSearchParams;
  toggle: (k: string, s: string) => void;
  setParams: (u: Record<string, string | null>) => void;
  lockedCategory?: string;
}) {
  if (!filters) return <p className="text-sm text-mute">Filtres indisponibles.</p>;
  const has = (k: string, s: string) => (params.get(k) ?? "").split(",").includes(s);
  const groups: { key: string; title: string; items: Facet[] }[] = [
    ...(lockedCategory ? [] : [{ key: "category", title: "Catégorie", items: filters.categories }]),
    { key: "material", title: "Matériau", items: filters.materials },
    { key: "personalization", title: "Personnalisation", items: filters.personalizations },
    { key: "usage", title: "Usage", items: filters.usages },
    { key: "event", title: "Événement", items: filters.events },
  ];

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <fieldset key={g.key}>
          <legend className="eyebrow mb-3">{g.title}</legend>
          <div className="flex flex-col gap-1">
            {g.items.filter((f) => (f.products_count ?? 1) > 0).map((f) => (
              <label key={f.slug} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-mute transition hover:bg-raised hover:text-ink">
                <span className="flex items-center gap-2.5">
                  <input type="checkbox" checked={has(g.key, f.slug)} onChange={() => toggle(g.key, f.slug)} className="size-4 accent-[var(--accent)]" />
                  {f.color_hex && <span className="size-3 rounded-full border border-white/15" style={{ background: f.color_hex }} aria-hidden />}
                  {f.name}
                </span>
                <span className="font-mono text-xs text-faint">{f.products_count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend className="eyebrow mb-3">Budget unitaire max.</legend>
        <input
          type="range"
          min={filters.price.min}
          max={filters.price.max}
          step={500}
          value={Number(params.get("price_max") ?? filters.price.max)}
          onChange={(e) => setParams({ price_max: Number(e.target.value) >= filters.price.max ? null : e.target.value })}
          className="w-full accent-[var(--accent)]"
          aria-label="Prix maximum"
        />
        <p className="mt-1 font-mono text-xs text-mute">{params.get("price_max") ? `≤ ${fcfa(Number(params.get("price_max")))}` : "Tous les prix"}</p>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">Dimensions (hauteur)</legend>
        <div className="flex gap-2">
          {[["", "Toutes"], ["0-200", "≤ 20 cm"], ["200-350", "20–35 cm"], ["350-10000", "> 35 cm"]].map(([v, l]) => {
            const current = `${params.get("height_min") ?? ""}${params.get("height_max") ? "-" + params.get("height_max") : ""}`;
            const active = v === "" ? !params.get("height_max") : current === v;
            return (
              <button
                key={l}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const [min, max] = v.split("-");
                  setParams({ height_min: min || null, height_max: max || null });
                }}
                className={cn("flex-1 rounded-full border px-2 py-1.5 text-xs", active ? "border-accent text-ink" : "border-line-strong text-mute")}
              >
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mute">
        <input type="checkbox" checked={has("availability", "in_stock")} onChange={() => toggle("availability", "in_stock")} className="size-4 accent-[var(--accent)]" />
        Disponible en stock
      </label>
    </div>
  );
}
