"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EstimateDisplay, useEstimate } from "@/components/site/estimate-panel";
import { ContactForm, type SubmittedProject, SubmissionSuccess, submitProject } from "@/components/site/project-submit";
import { TrophyViewer } from "@/components/three/trophy-viewer";
import { Button } from "@/components/ui/button";
import { ChoiceChips, Field, Input } from "@/components/ui/field";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Skeleton, Stepper } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { cn, fcfa } from "@/lib/format";
import { BASES, DEFAULT_TROPHY, FINISHES, FONTS, METALS, SHAPES, type TrophyConfig } from "@/lib/trophy";
import type { Paginated, Product } from "@/lib/types";

const STEPS = ["Type", "Forme", "Matériau", "Couleur", "Socle", "Taille", "Finition", "Texte", "Logo", "Quantité"];

const TYPES = [
  { value: "trophees", label: "Trophée", hint: "Coupes, étoiles, colonnes, cristal", shapes: ["cup", "star", "column", "crystal"] },
  { value: "medailles", label: "Médaille", hint: "Frappée ou acrylique, avec ruban", shapes: ["medal"] },
  { value: "plaques", label: "Plaque", hint: "Honorifique, commémorative", shapes: ["plaque"] },
] as const;

type TypeValue = (typeof TYPES)[number]["value"];

/**
 * « Configurez votre trophée » : 10 étapes, aperçu 3D qui évolue en temps réel,
 * estimation serveur à chaque choix, envoi comme demande de projet (canal configurateur).
 */
export function Configurator({ initialSlug, initialType }: { initialSlug?: string; initialType?: string }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<TypeValue>((TYPES.find((t) => t.value === initialType)?.value ?? "trophees") as TypeValue);
  const [product, setProduct] = useState<Product | null>(null);
  const [config, setConfig] = useState<TrophyConfig>(DEFAULT_TROPHY);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [logos, setLogos] = useState<UploadedFile[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [submitted, setSubmitted] = useState<{ project: SubmittedProject; contact: string } | null>(null);

  const products = useQuery({
    queryKey: ["configurable-products"],
    queryFn: () => api<Paginated<Product>>("/catalog/products", { query: { configurable: 1, per_page: 40 } }),
    staleTime: 300_000,
  });

  // Détail du produit choisi (matériaux, finitions, tailles)
  const detail = useQuery({
    queryKey: ["product", product?.slug],
    queryFn: () => api<{ data: Product }>(`/catalog/products/${product!.slug}`).then((r) => r.data),
    enabled: !!product,
    staleTime: 300_000,
  });
  const full = detail.data ?? product;

  const byType = useMemo(
    () => (products.data?.data ?? []).filter((p) => p.category?.slug === type && p.model_3d),
    [products.data, type],
  );

  const pick = useCallback((p: Product) => {
    setProduct(p);
    setConfig((c) => ({ ...c, shape: p.model_3d ?? c.shape, metal: p.model_3d === "crystal" ? "crystal" : c.metal === "crystal" ? "gold" : c.metal }));
    setSize(p.size_options?.[0]?.label ?? null);
    setQuantity(p.category?.slug === "medailles" ? 50 : 1);
  }, []);

  // Pré-sélection depuis une fiche produit (?product=slug), une fois le catalogue chargé
  useEffect(() => {
     
    if (!products.data || product) return;
    const initial = initialSlug ? products.data.data.find((p) => p.slug === initialSlug) : null;
    if (initial) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
      setType((initial.category?.slug as TypeValue) ?? "trophees");
      pick(initial);
      setStep(2);
    } else if (byType[0]) pick(byType[0]);
  }, [products.data, initialSlug, byType, product, pick]);

  // Le logo affiché sur l’aperçu est dérivé des fichiers envoyés (pas d état dupliqué)
  const logoUrl = logos.find((l) => l.preview && l.status === "done")?.preview ?? null;
  const viewerConfig = useMemo(() => ({ ...config, logoUrl }), [config, logoUrl]);

  // Correspondance configuration → référentiel du back-office (matériau, finition)
  const materialId = full?.materials?.find((m) => m.slug === METALS[config.metal].materialSlug)?.id ?? full?.materials?.[0]?.id ?? null;
  const finishId = full?.finishes?.find((f) => f.slug === FINISHES[config.finish].finishSlug)?.id ?? null;
  const hasLogo = logos.some((l) => l.status === "done");

  const estimate = useEstimate({
    product_id: product?.id,
    quantity,
    size,
    material_id: materialId,
    finish_id: finishId,
    personalizations: ["gravure"],
    has_logo: hasLogo,
  });

  const update = <K extends keyof TrophyConfig>(key: K, value: TrophyConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));
  const engrave = (patch: Partial<TrophyConfig["engraving"]>) => setConfig((c) => ({ ...c, engraving: { ...c.engraving, ...patch } }));

  const scaleFor = (label: string | null) => {
    const opt = full?.size_options?.find((s) => s.label === label);
    const base = full?.size_options?.[0]?.height_mm ?? opt?.height_mm ?? 1;
    return opt?.height_mm ? Math.min(1.25, Math.max(0.85, 0.85 + ((opt.height_mm - base) / base) * 0.6)) : 1;
  };

  const submit = async (contact: Record<string, unknown>) => {
    const project = await submitProject({
      ...contact,
      channel: "configurator",
      project_type: type === "trophees" ? "trophee" : type === "medailles" ? "medaille" : "plaque",
      product_id: product?.id,
      material_id: materialId,
      finish_id: finishId,
      quantity,
      title: `${full?.name ?? "Trophée"} personnalisé`,
      personalization: {
        modes: ["gravure"],
        lines: config.engraving.lines.filter(Boolean),
        text: config.engraving.lines.filter(Boolean).join(" / "),
        font: config.engraving.font,
        color: config.engraving.color,
        align: config.engraving.align,
        placement: config.engraving.placement,
        size: config.engraving.size,
      },
      configuration: { shape: config.shape, metal: config.metal, finish: config.finish, base: config.base, size },
      file_tokens: logos.filter((l) => l.token).map((l) => l.token),
    });
    setSubmitted({ project, contact: String(contact.contact_phone) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) return <div className="container-x py-32"><SubmissionSuccess project={submitted.project} contact={submitted.contact} /></div>;

  const allowedShapes = TYPES.find((t) => t.value === type)!.shapes as readonly string[];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.25fr_1fr]">
      {/* Aperçu 3D */}
      <div className="relative h-[46svh] border-b border-line bg-[radial-gradient(ellipse_at_center,#1d1d21,#0a0a0b_70%)] lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
        <TrophyViewer config={viewerConfig} className="absolute inset-x-0 top-16 bottom-0 lg:bottom-28" autoRotate={step !== 7} distance={5.8} />
        <div className="pointer-events-none absolute top-20 left-4 font-mono text-[0.65rem] tracking-[0.25em] text-faint md:top-24 md:left-8">
          <p>{full?.reference ?? "—"}</p>
          <p className="mt-1 text-accent">{full?.name ?? "Choisissez un modèle"}</p>
        </div>
        <div className="absolute right-4 bottom-4 left-4 md:right-8 md:bottom-8 md:left-auto md:w-80">
          <EstimateDisplay estimate={estimate.data} loading={estimate.isFetching} compact className="bg-surface/80 backdrop-blur-xl" />
        </div>
      </div>

      {/* Panneau de configuration */}
      <div className="flex flex-col px-4 pt-8 pb-32 md:px-10 lg:pt-28">
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />

          <motion.div key={finishing ? "contact" : step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="mt-8 flex-1">
            {finishing ? (
              <section aria-labelledby="t-contact">
                <h2 id="t-contact" className="display text-4xl text-ink">Presque terminé.</h2>
                <p className="mt-3 text-mute">Où devons-nous envoyer votre BAT et votre devis ?</p>
                <Summary config={config} product={full} size={size} quantity={quantity} logos={logos.length} />
                <div className="mt-8"><ContactForm onSubmit={submit} submitLabel="Envoyer mon trophée à l'atelier" /></div>
              </section>
            ) : (
              <StepBody
                step={step}
                type={type}
                setType={(t) => {
                  setType(t);
                  const first = (products.data?.data ?? []).find((p) => p.category?.slug === t && p.model_3d);
                  if (first) pick(first);
                }}
                loading={products.isPending}
                products={byType}
                product={product}
                pick={pick}
                full={full}
                config={config}
                update={update}
                engrave={engrave}
                allowedShapes={allowedShapes}
                size={size}
                setSize={(s) => {
                  setSize(s);
                  update("scale", scaleFor(s));
                }}
                quantity={quantity}
                setQuantity={setQuantity}
                setLogos={setLogos}
                estimateMin={estimate.data?.estimate_min ?? null}
              />
            )}
          </motion.div>

        {!finishing && (
          <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-canvas/90 px-4 py-4 backdrop-blur-xl md:static md:mt-10 md:border-0 md:bg-transparent md:p-0">
            <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Retour</Button>
            {step < STEPS.length - 1 ? (
              <Button className="flex-1" onClick={() => setStep((s) => s + 1)} disabled={!product}>
                Continuer — {STEPS[step + 1]}
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => setFinishing(true)}>Valider ma configuration</Button>
            )}
          </div>
        )}
        {finishing && (
          <button type="button" className="mt-6 text-sm text-mute underline underline-offset-4 hover:text-ink" onClick={() => setFinishing(false)}>
            ← Revenir à la configuration
          </button>
        )}
      </div>
    </div>
  );
}

function StepBody(props: {
  step: number;
  type: TypeValue;
  setType: (t: TypeValue) => void;
  loading: boolean;
  products: Product[];
  product: Product | null;
  pick: (p: Product) => void;
  full: Product | null | undefined;
  config: TrophyConfig;
  update: <K extends keyof TrophyConfig>(key: K, value: TrophyConfig[K]) => void;
  engrave: (patch: Partial<TrophyConfig["engraving"]>) => void;
  allowedShapes: readonly string[];
  size: string | null;
  setSize: (s: string) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  setLogos: (f: UploadedFile[]) => void;
  estimateMin: number | null;
}) {
  const { step, config, update, engrave, full } = props;

  switch (step) {
    case 0:
      return (
        <section>
          <Title hint="Quel type de récompense voulez-vous créer ?">Type de récompense</Title>
          <div className="grid gap-3">
            {TYPES.map((t) => (
              <OptionCard key={t.value} selected={props.type === t.value} onClick={() => props.setType(t.value)} title={t.label} hint={t.hint} />
            ))}
          </div>
        </section>
      );
    case 1:
      return (
        <section>
          <Title hint="Chaque modèle se personnalise entièrement.">Forme &amp; modèle</Title>
          {props.loading ? (
            <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {props.products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={props.product?.id === p.id}
                  onClick={() => props.pick(p)}
                  className={cn("group overflow-hidden rounded-2xl border text-left transition", props.product?.id === p.id ? "border-accent" : "border-line hover:border-line-strong")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images?.[0]?.src} alt="" className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="p-3">
                    <p className="text-sm font-medium text-ink">{p.name}</p>
                    <p className="font-mono text-xs text-faint">{SHAPES.find((s) => s.value === p.model_3d)?.label} · dès {fcfa(p.price.from)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      );
    case 2:
      return (
        <section>
          <Title hint="Les matières proposées pour ce modèle.">Matériau</Title>
          <div className="grid gap-3">
            {(full?.materials ?? []).map((m) => {
              const metal = (Object.entries(METALS).find(([, v]) => v.materialSlug === m.slug)?.[0] ?? null) as keyof typeof METALS | null;
              const selected = metal ? config.metal === metal : false;
              return (
                <OptionCard key={m.id} selected={selected} onClick={() => metal && update("metal", metal)} title={m.name} swatch={m.color_hex ?? undefined} hint={metal ? `Rendu ${METALS[metal].label.toLowerCase()}` : "Rendu sur BAT"} />
              );
            })}
            {!full?.materials?.length && <p className="text-mute">Matériau défini par le modèle.</p>}
          </div>
        </section>
      );
    case 3:
      return (
        <section>
          <Title hint="La teinte du métal ou du cristal.">Couleur</Title>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(Object.keys(METALS) as (keyof typeof METALS)[])
              .filter((k) => (config.shape === "crystal" ? k === "crystal" : k !== "crystal"))
              .map((k) => (
                <button key={k} type="button" aria-pressed={config.metal === k} onClick={() => update("metal", k)} className={cn("flex flex-col items-center gap-3 rounded-2xl border p-5 transition", config.metal === k ? "border-accent bg-accent/5" : "border-line hover:border-line-strong")}>
                  <span className="size-12 rounded-full border border-white/15 shadow-inner" style={{ background: METALS[k].swatch }} aria-hidden />
                  <span className="text-sm text-ink">{METALS[k].label}</span>
                </button>
              ))}
          </div>
        </section>
      );
    case 4:
      return (
        <section>
          <Title hint={config.shape === "medal" || config.shape === "plaque" ? "Pour une plaque, le socle devient le support." : "Le socle porte la plaque gravée."}>Socle &amp; support</Title>
          <div className="grid gap-3">
            {(Object.keys(BASES) as (keyof typeof BASES)[]).map((b) => (
              <OptionCard key={b} selected={config.base === b} onClick={() => update("base", b)} title={BASES[b].label} swatch={b === "aucun" ? undefined : BASES[b].color} />
            ))}
          </div>
        </section>
      );
    case 5:
      return (
        <section>
          <Title hint="La taille influe sur le prix : l'estimation se met à jour.">Taille</Title>
          {full?.size_options?.length ? (
            <div className="grid gap-3">
              {full.size_options.map((s) => (
                <OptionCard key={s.label} selected={props.size === s.label} onClick={() => props.setSize(s.label)} title={s.label} hint={s.multiplier !== 1 ? `× ${s.multiplier.toLocaleString("fr-FR")} sur le prix de base` : "Taille de référence"} />
              ))}
            </div>
          ) : (
            <p className="text-mute">Ce modèle existe en taille unique. Besoin d&apos;une autre dimension ? Précisez-le dans votre demande.</p>
          )}
        </section>
      );
    case 6:
      return (
        <section>
          <Title hint="Du miroir au mat : observez les reflets changer.">Finition</Title>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(FINISHES) as (keyof typeof FINISHES)[]).map((f) => (
              <OptionCard key={f} selected={config.finish === f} onClick={() => update("finish", f)} title={FINISHES[f].label} />
            ))}
          </div>
        </section>
      );
    case 7:
      return (
        <section>
          <Title hint="Saisissez votre texte : il apparaît instantanément sur l'objet.">Texte gravé</Title>
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Field key={i} label={i === 0 ? "Ligne principale" : `Ligne ${i + 1}`}>
                {(p) => (
                  <Input
                    {...p}
                    value={config.engraving.lines[i] ?? ""}
                    maxLength={40}
                    placeholder={i === 0 ? "CHAMPION 2026" : i === 1 ? "Tournoi d'Abidjan" : "Catégorie, nom…"}
                    onChange={(e) => {
                      const lines = [...config.engraving.lines];
                      lines[i] = e.target.value;
                      engrave({ lines });
                    }}
                  />
                )}
              </Field>
            ))}
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Police</p>
              <ChoiceChips ariaLabel="Police" options={(Object.keys(FONTS) as (keyof typeof FONTS)[]).map((f) => ({ value: f, label: FONTS[f].label }))} value={config.engraving.font} onChange={(v) => engrave({ font: v as TrophyConfig["engraving"]["font"] })} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Alignement</p>
              <ChoiceChips ariaLabel="Alignement" options={[{ value: "left", label: "Gauche" }, { value: "center", label: "Centré" }, { value: "right", label: "Droite" }]} value={config.engraving.align} onChange={(v) => engrave({ align: v as "left" | "center" | "right" })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Taille du texte — ${Math.round(config.engraving.size * 100)} %`}>
                {(p) => <input {...p} type="range" min={0.6} max={1.4} step={0.05} value={config.engraving.size} onChange={(e) => engrave({ size: Number(e.target.value) })} className="accent-[var(--accent)]" />}
              </Field>
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Couleur de gravure</p>
                <ChoiceChips ariaLabel="Couleur de gravure" options={[{ value: "#2A1E0A", label: "Gravure naturelle", swatch: "#2A1E0A" }, { value: "#FFFFFF", label: "Blanc", swatch: "#fff" }, { value: "#9C1C1C", label: "Rouge", swatch: "#9C1C1C" }]} value={config.engraving.color} onChange={(v) => engrave({ color: v as string })} />
              </div>
            </div>
            {config.shape === "crystal" && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Emplacement</p>
                <ChoiceChips ariaLabel="Emplacement" options={[{ value: "socle", label: "Sur le socle" }, { value: "face", label: "Dans le cristal" }]} value={config.engraving.placement} onChange={(v) => engrave({ placement: v as "socle" | "face" })} />
              </div>
            )}
          </div>
        </section>
      );
    case 8:
      return (
        <section>
          <Title hint="PNG, JPG, SVG ou PDF. Un aperçu s'affiche sur l'objet (images).">Logo</Title>
          <FileUploader onChange={props.setLogos} kind="logo" max={3} label="Déposez votre logo" />
          <p className="mt-4 text-xs text-faint">Étape facultative. Un fichier vectoriel (SVG, PDF, AI) garantit la meilleure gravure ; des frais de préparation s&apos;appliquent pour un logo.</p>
        </section>
      );
    default:
      return (
        <section>
          <Title hint="Le dégressif s'applique automatiquement.">Quantité</Title>
          <div className="flex items-center gap-3">
            <Button variant="secondary" aria-label="Diminuer" onClick={() => props.setQuantity(Math.max(1, props.quantity - (props.quantity > 20 ? 10 : 1)))}>−</Button>
            <Input type="number" min={1} value={props.quantity} onChange={(e) => props.setQuantity(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantité" className="w-32 text-center text-lg" inputMode="numeric" />
            <Button variant="secondary" aria-label="Augmenter" onClick={() => props.setQuantity(props.quantity + (props.quantity >= 20 ? 10 : 1))}>+</Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[1, 5, 10, 25, 50, 100].map((n) => (
              <button key={n} type="button" onClick={() => props.setQuantity(n)} className={cn("rounded-full border px-4 py-1.5 font-mono text-sm", props.quantity === n ? "border-accent text-ink" : "border-line-strong text-mute")}>
                {n}
              </button>
            ))}
          </div>
          {props.estimateMin && <p className="mt-6 text-mute">Soit environ <span className="text-ink">{fcfa(Math.round(props.estimateMin / props.quantity))}</span> par pièce.</p>}
        </section>
      );
  }
}

function Title({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="display text-3xl text-ink md:text-4xl">{children}</h2>
      {hint && <p className="mt-2 text-mute">{hint}</p>}
    </div>
  );
}

function OptionCard({ selected, onClick, title, hint, swatch }: { selected: boolean; onClick: () => void; title: string; hint?: string; swatch?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn("flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300", selected ? "border-accent bg-accent/5" : "border-line hover:border-line-strong hover:bg-raised/50")}
    >
      {swatch && <span className="size-9 shrink-0 rounded-full border border-white/15" style={{ background: swatch }} aria-hidden />}
      <span className="flex-1">
        <span className="block font-medium text-ink">{title}</span>
        {hint && <span className="block text-sm text-mute">{hint}</span>}
      </span>
      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.6rem]", selected ? "border-accent bg-accent text-accent-ink" : "border-line-strong")} aria-hidden>
        {selected && "✓"}
      </span>
    </button>
  );
}

function Summary({ config, product, size, quantity, logos }: { config: TrophyConfig; product?: Product | null; size: string | null; quantity: number; logos: number }) {
  const rows = [
    ["Modèle", product?.name ?? "—"],
    ["Couleur", METALS[config.metal].label],
    ["Finition", FINISHES[config.finish].label],
    ["Socle", BASES[config.base].label],
    ["Taille", size ?? "Unique"],
    ["Texte", config.engraving.lines.filter(Boolean).join(" / ") || "—"],
    ["Logo", logos ? `${logos} fichier(s)` : "Aucun"],
    ["Quantité", String(quantity)],
  ];
  return (
    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-line bg-surface p-5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">{k}</dt>
          <dd className="mt-0.5 truncate text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
