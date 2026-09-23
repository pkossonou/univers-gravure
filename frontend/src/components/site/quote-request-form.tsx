"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, type FieldPath, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox, ChoiceChips, DatePicker, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Stepper } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/format";
import { type QuoteRequestValues, quoteRequestSchema } from "@/lib/schemas";
import { PROJECT_TYPES } from "@/lib/site";
import type { Finish, Material, Paginated, Product } from "@/lib/types";
import { PERSONALIZATION_LABELS } from "@/lib/visuals";
import { EstimateDisplay, useEstimate } from "./estimate-panel";
import { type SubmittedProject, SubmissionSuccess, submitProject } from "./project-submit";

const STEPS = ["Vos informations", "Type de projet", "Quantité & dimensions", "Personnalisation", "Fichiers", "Délai", "Récapitulatif", "Validation"];

const STEP_FIELDS: FieldPath<QuoteRequestValues>[][] = [
  ["contact_name", "contact_phone", "contact_email", "company", "city"],
  ["project_type", "title", "description"],
  ["quantity", "width_mm", "height_mm"],
  ["modes", "text"],
  [],
  ["urgency", "desired_date"],
  [],
  ["consent"],
];

const CATEGORY_TO_TYPE: Record<string, string> = {
  trophees: "trophee", medailles: "medaille", plaques: "plaque", gravure: "gravure", impression: "impression",
  "supports-publicitaires": "impression", signaletique: "signaletique", "objets-personnalises": "objet", "cadeaux-entreprise": "cadeau",
};

export function QuoteRequestForm() {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [done, setDone] = useState<{ project: SubmittedProject; contact: string } | null>(null);

  const presetType = params.get("type") ?? "";
  const { register, control, handleSubmit, trigger, watch, setError, formState: { errors, isSubmitting } } = useForm<QuoteRequestValues>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      company: "",
      project_type: CATEGORY_TO_TYPE[presetType] ?? (PROJECT_TYPES.some((t) => t.value === presetType) ? presetType : ""),
      product_id: params.get("product") ? Number(params.get("product")) : null,
      quantity: Number(params.get("qty")) || 1,
      modes: [],
      urgency: "standard",
      consent: false,
    },
    mode: "onTouched",
  });

  const values = watch();
  const materials = useQuery({ queryKey: ["materials"], queryFn: () => api<{ data: Material[] }>("/catalog/materials").then((r) => r.data), staleTime: 600_000 });
  const finishes = useQuery({ queryKey: ["finishes"], queryFn: () => api<{ data: Finish[] }>("/catalog/finishes").then((r) => r.data), staleTime: 600_000 });
  const product = useQuery({
    queryKey: ["product-by-id", values.product_id],
    queryFn: () => api<Paginated<Product>>("/catalog/products", { query: { id: values.product_id } }).then((r) => r.data[0] ?? null),
    enabled: !!values.product_id,
    staleTime: 600_000,
  });

  const estimate = useEstimate({
    product_id: values.product_id,
    project_type: values.project_type || null,
    quantity: values.quantity || 1,
    width_mm: values.width_mm,
    height_mm: values.height_mm,
    material_id: values.material_id,
    finish_id: values.finish_id,
    personalizations: values.modes,
    has_logo: files.some((f) => f.status === "done"),
    urgency: values.urgency,
  });

  const next = async () => {
    if (await trigger(STEP_FIELDS[step])) setStep((s) => s + 1);
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      const project = await submitProject({
        channel: "quote_form",
        contact_name: v.contact_name, contact_phone: v.contact_phone, contact_email: v.contact_email || undefined,
        company: v.company || undefined, city: v.city || undefined,
        project_type: v.project_type, product_id: v.product_id || undefined, title: v.title || undefined, description: v.description || undefined,
        quantity: v.quantity, width_mm: v.width_mm || undefined, height_mm: v.height_mm || undefined,
        material_id: v.material_id || undefined, finish_id: v.finish_id || undefined,
        personalization: { modes: v.modes, text: v.text || undefined },
        urgency: v.urgency, desired_date: v.desired_date || undefined,
        file_tokens: files.filter((f) => f.token).map((f) => f.token),
        consent: v.consent,
      });
      setDone({ project, contact: v.contact_phone });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [field, msgs] of Object.entries(e.errors)) setError(field as FieldPath<QuoteRequestValues>, { message: msgs[0] });
        setError("root", { message: e.message });
        const firstStep = STEP_FIELDS.findIndex((fields) => fields.some((f) => e.errors[f]));
        if (firstStep >= 0) setStep(firstStep);
      } else setError("root", { message: "Connexion impossible. Réessayez dans un instant." });
    }
  });

  if (done) return <SubmissionSuccess project={done.project} contact={done.contact} />;

  const typeLabel = PROJECT_TYPES.find((t) => t.value === values.project_type)?.label;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <form onSubmit={onSubmit} noValidate className="min-w-0">
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
          <motion.fieldset key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mt-10 flex flex-col gap-5">
            <legend className="display mb-4 text-3xl text-ink md:text-4xl">{STEPS[step]}</legend>

            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nom complet" required error={errors.contact_name?.message}>{(p) => <Input {...p} {...register("contact_name")} autoComplete="name" />}</Field>
                <Field label="Numéro WhatsApp" required hint="Nous vous recontactons sur WhatsApp" error={errors.contact_phone?.message}>{(p) => <Input {...p} {...register("contact_phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="07 00 00 00 00" />}</Field>
                <Field label="E-mail" hint="Facultatif" error={errors.contact_email?.message}>{(p) => <Input {...p} {...register("contact_email")} type="email" autoComplete="email" />}</Field>
                <Field label="Entreprise / organisation">{(p) => <Input {...p} {...register("company")} autoComplete="organization" />}</Field>
                <Field label="Ville">{(p) => <Input {...p} {...register("city")} placeholder="Abidjan" autoComplete="address-level2" />}</Field>
              </div>
            )}

            {step === 1 && (
              <>
                <Controller
                  control={control}
                  name="project_type"
                  render={({ field }) => (
                    <div role="radiogroup" aria-label="Type de projet" className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {PROJECT_TYPES.map((t) => (
                        <button key={t.value} type="button" role="radio" aria-checked={field.value === t.value} onClick={() => field.onChange(t.value)} className={cn("rounded-2xl border p-4 text-left transition", field.value === t.value ? "border-accent bg-accent/5" : "border-line hover:border-line-strong")}>
                          <p className="font-medium text-ink">{t.label}</p>
                          <p className="text-xs text-mute">{t.hint}</p>
                        </button>
                      ))}
                    </div>
                  )}
                />
                {errors.project_type && <p role="alert" className="text-sm text-danger">{errors.project_type.message}</p>}
                {product.data && <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-ink">Produit sélectionné : <strong>{product.data.name}</strong> ({product.data.reference})</p>}
                <Field label="Intitulé du projet">{(p) => <Input {...p} {...register("title")} placeholder="Ex. : Trophées du tournoi inter-entreprises" />}</Field>
                <Field label="Décrivez votre besoin" hint="Occasion, style, contraintes…">{(p) => <Textarea {...p} {...register("description")} rows={5} />}</Field>
              </>
            )}

            {step === 2 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Quantité" required error={errors.quantity?.message}>{(p) => <Input {...p} type="number" min={1} inputMode="numeric" {...register("quantity", { valueAsNumber: true })} />}</Field>
                <div />
                <Field label="Largeur (mm)" error={errors.width_mm?.message} hint="Facultatif sauf impression / signalétique">{(p) => <Input {...p} type="number" {...register("width_mm", { setValueAs: (v) => (v === "" ? null : Number(v)) })} />}</Field>
                <Field label="Hauteur (mm)" error={errors.height_mm?.message}>{(p) => <Input {...p} type="number" {...register("height_mm", { setValueAs: (v) => (v === "" ? null : Number(v)) })} />}</Field>
                <Field label="Matériau souhaité">
                  {(p) => (
                    <Select {...p} {...register("material_id", { setValueAs: (v) => (v === "" ? null : Number(v)) })}>
                      <option value="">Conseillez-moi</option>
                      {materials.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Finition">
                  {(p) => (
                    <Select {...p} {...register("finish_id", { setValueAs: (v) => (v === "" ? null : Number(v)) })}>
                      <option value="">Conseillez-moi</option>
                      {finishes.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                  )}
                </Field>
              </div>
            )}

            {step === 3 && (
              <>
                <Controller
                  control={control}
                  name="modes"
                  render={({ field }) => (
                    <div>
                      <p className="mb-2 text-sm font-medium text-ink">Techniques souhaitées</p>
                      <ChoiceChips multiple ariaLabel="Techniques" options={Object.entries(PERSONALIZATION_LABELS).map(([value, label]) => ({ value, label }))} value={field.value} onChange={(v) => field.onChange(v)} />
                    </div>
                  )}
                />
                <Field label="Texte à graver / imprimer" hint="Noms, dates, slogan… (300 caractères max.)" error={errors.text?.message}>{(p) => <Textarea {...p} {...register("text")} rows={3} />}</Field>
              </>
            )}

            {step === 4 && <FileUploader onChange={setFiles} kind="maquette" label="Logo, maquette, photo ou fichier graphique" />}

            {step === 5 && (
              <>
                <Controller
                  control={control}
                  name="urgency"
                  render={({ field }) => (
                    <ChoiceChips ariaLabel="Urgence" options={[{ value: "flexible", label: "Flexible (remise)" }, { value: "standard", label: "Standard" }, { value: "express", label: "Express (majoré)" }]} value={field.value} onChange={(v) => field.onChange(v)} />
                  )}
                />
                <Field label="Date souhaitée" hint="Laissez vide si vous n'avez pas d'échéance précise" error={errors.desired_date?.message}>
                  {(p) => <DatePicker {...p} {...register("desired_date")} min={new Date().toISOString().slice(0, 10)} />}
                </Field>
              </>
            )}

            {step === 6 && (
              <dl className="grid gap-x-8 gap-y-4 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-2">
                {[
                  ["Contact", `${values.contact_name} · WhatsApp ${values.contact_phone}${values.contact_email ? ` · ${values.contact_email}` : ""}`],
                  ["Organisation", values.company || "—"],
                  ["Projet", `${typeLabel ?? "—"}${values.title ? ` — ${values.title}` : ""}`],
                  ["Produit", product.data?.name ?? "Sur mesure"],
                  ["Quantité", String(values.quantity)],
                  ["Dimensions", values.width_mm && values.height_mm ? `${values.width_mm} × ${values.height_mm} mm` : "—"],
                  ["Personnalisation", values.modes.map((m) => PERSONALIZATION_LABELS[m]).join(", ") || "—"],
                  ["Texte", values.text || "—"],
                  ["Fichiers", `${files.filter((f) => f.status === "done").length} envoyé(s)`],
                  ["Délai", `${values.urgency}${values.desired_date ? ` — avant le ${new Date(values.desired_date).toLocaleDateString("fr-FR")}` : ""}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">{k}</dt>
                    <dd className="mt-1 text-sm break-words text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {step === 7 && (
              <>
                <p className="text-mute">En validant, votre demande reçoit un numéro unique. Notre équipe prépare votre devis et vous recontacte.</p>
                <Checkbox {...register("consent")} label="J'accepte d'être recontacté par UNIVERS GRAVURE au sujet de ce projet." />
                {errors.consent && <p role="alert" className="text-sm text-danger">{errors.consent.message}</p>}
              </>
            )}

            {errors.root && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{errors.root.message}</p>}
          </motion.fieldset>

        <div className="mt-10 flex gap-3">
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Retour</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continuer — {STEPS[step + 1]}</Button>
          ) : (
            <Button type="submit" loading={isSubmitting}>Valider ma demande de devis</Button>
          )}
        </div>
      </form>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <EstimateDisplay estimate={estimate.data} loading={estimate.isFetching} />
      </aside>
    </div>
  );
}
