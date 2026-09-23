"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceChips, DatePicker, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Stepper } from "@/components/ui/primitives";
import { cn } from "@/lib/format";
import { PROJECT_TYPES } from "@/lib/site";
import { EstimateDisplay, useEstimate } from "./estimate-panel";
import { ContactForm, type SubmittedProject, SubmissionSuccess, submitProject } from "./project-submit";

const STEPS = ["Votre modèle", "Votre version", "Délai & budget", "Envoi"];

const REPRODUCTION = [
  { value: "identique", label: "Le reproduire", hint: "Même forme et même esprit, avec vos textes et logos" },
  { value: "inspiration", label: "M'en inspirer", hint: "Nous l'adaptons : forme, couleurs ou matières différentes" },
] as const;

const COLORS = ["Or", "Argent", "Bronze", "Noir", "Bois", "Verre / cristal", "Couleurs de mon logo"];

const BUDGETS = ["Moins de 25 000 FCFA / pièce", "25 000 – 50 000 FCFA / pièce", "50 000 – 100 000 FCFA / pièce", "Plus de 100 000 FCFA / pièce", "Je ne sais pas encore"];

/**
 * « J'ai une photo du modèle » : le client n'a pas besoin de concevoir, il montre ce qu'il veut
 * (trophée vu à un événement, sur Internet, chez un concurrent…) et précise ses attentes.
 * L'équipe reçoit la demande avec les photos en pièces jointes (canal « photo_model »).
 */
export function ModelRequest() {
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<UploadedFile[]>([]);
  const [logos, setLogos] = useState<UploadedFile[]>([]);
  const [mode, setMode] = useState<"identique" | "inspiration">("identique");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState("trophee");
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [urgency, setUrgency] = useState<"flexible" | "standard" | "express">("standard");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ project: SubmittedProject; email: string } | null>(null);

  const readyPhotos = photos.filter((p) => p.status === "done");
  const uploading = [...photos, ...logos].some((f) => f.status === "uploading");
  const estimate = useEstimate({ project_type: type, quantity, personalizations: text ? ["gravure"] : [], has_logo: logos.some((l) => l.status === "done"), urgency });

  const next = () => {
    if (step === 0 && readyPhotos.length === 0) return setError("Ajoutez au moins une photo du modèle.");
    if (step === 0 && mode === "inspiration" && !notes.trim()) return setError("Dites-nous ce que vous souhaitez changer par rapport au modèle.");
    setError(null);
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (done) return <SubmissionSuccess project={done.project} email={done.email} />;

  const typeLabel = PROJECT_TYPES.find((t) => t.value === type)?.label ?? "Projet";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <Stepper steps={STEPS} current={step} onStepClick={(i) => i < step && setStep(i)} />

        <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="mt-10 flex flex-col gap-6">
          {step === 0 && (
            <>
              <div>
                <h2 className="display text-3xl text-ink md:text-4xl">Montrez-nous le modèle</h2>
                <p className="mt-2 text-mute">Photo prise à un événement, capture d&apos;écran d&apos;Internet ou de WhatsApp, catalogue… Plusieurs angles nous aident à mieux comprendre.</p>
              </div>
              <FileUploader onChange={setPhotos} kind="photo" max={6} capture={false} label="Déposez la ou les photos du modèle" />
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Que souhaitez-vous ?</p>
                <div role="radiogroup" aria-label="Reproduction ou inspiration" className="grid gap-3 sm:grid-cols-2">
                  {REPRODUCTION.map((r) => (
                    <button key={r.value} type="button" role="radio" aria-checked={mode === r.value} onClick={() => setMode(r.value)} className={cn("rounded-2xl border p-4 text-left transition", mode === r.value ? "border-accent bg-accent/5" : "border-line hover:border-line-strong")}>
                      <p className="font-medium text-ink">{r.label}</p>
                      <p className="text-sm text-mute">{r.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Field label={mode === "inspiration" ? "Qu'aimeriez-vous changer ?" : "Précisions sur le modèle"} required={mode === "inspiration"} hint="Ex. : même forme mais en bleu, socle plus haut, remplacer l'étoile par un ballon, logo à la place de la médaille…">
                {(p) => <Textarea {...p} rows={4} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />}
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="display text-3xl text-ink md:text-4xl">Votre version</h2>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Type d'objet">
                  {(p) => <Select {...p} value={type} onChange={(e) => setType(e.target.value)}>{PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>}
                </Field>
                <Field label="Quantité" required>
                  {(p) => <Input {...p} type="number" min={1} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />}
                </Field>
                <Field label="Taille souhaitée" hint="Ex. : 35 cm de haut, A4, « comme sur la photo »">
                  {(p) => <Input {...p} maxLength={100} value={size} onChange={(e) => setSize(e.target.value)} />}
                </Field>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Couleurs et matières souhaitées</p>
                <ChoiceChips multiple ariaLabel="Couleurs et matières" options={COLORS.map((c) => ({ value: c, label: c }))} value={colors} onChange={(v) => setColors(v as string[])} />
              </div>
              <Field label="Texte à graver ou imprimer" hint="Noms, titre du prix, événement, date… une ligne par texte">
                {(p) => <Textarea {...p} rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder={"MEILLEUR JOUEUR\nTournoi inter-entreprises 2026"} />}
              </Field>
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Votre logo (facultatif)</p>
                <FileUploader onChange={setLogos} kind="logo" max={3} compact label="Déposez votre logo" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="display text-3xl text-ink md:text-4xl">Délai & budget</h2>
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Délai</p>
                <ChoiceChips ariaLabel="Délai" options={[{ value: "flexible", label: "Flexible" }, { value: "standard", label: "Standard" }, { value: "express", label: "Urgent" }]} value={urgency} onChange={(v) => setUrgency(v as typeof urgency)} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date de l'événement / de remise" hint="Facultatif">
                  {(p) => <DatePicker {...p} min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />}
                </Field>
                <Field label="Budget indicatif" hint="Facultatif — nous aide à vous proposer la bonne matière">
                  {(p) => <Select {...p} value={budget} onChange={(e) => setBudget(e.target.value)}><option value="">Non précisé</option>{BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}</Select>}
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="display text-3xl text-ink md:text-4xl">Où vous répondre ?</h2>
              <p className="text-mute">Notre équipe étudie votre modèle et vous envoie une proposition avec devis. Aucun engagement à ce stade.</p>
              <ContactForm
                submitLabel="Envoyer mon modèle à l'atelier"
                onSubmit={async (contact) => {
                  const description = [
                    mode === "identique" ? "Souhait : reproduire le modèle en photo." : "Souhait : s'inspirer du modèle en photo.",
                    notes && `Précisions : ${notes}`,
                    size && `Taille souhaitée : ${size}`,
                    colors.length > 0 && `Couleurs / matières : ${colors.join(", ")}`,
                    budget && `Budget indicatif : ${budget}`,
                  ].filter(Boolean).join("\n");
                  const project = await submitProject({
                    ...contact,
                    channel: "photo_model",
                    project_type: type,
                    title: `${typeLabel} d'après photo`,
                    description,
                    quantity,
                    urgency,
                    desired_date: date || undefined,
                    personalization: { modes: text ? ["gravure"] : [], text: text || undefined, lines: text ? text.split("\n").filter(Boolean) : undefined },
                    configuration: { reproduction: mode, desired_size: size || null, colors, budget: budget || null },
                    file_tokens: [...photos, ...logos].filter((f) => f.token).map((f) => f.token),
                  });
                  setDone({ project, email: contact.contact_email });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}

          {error && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
        </motion.div>

        {step < 3 && (
          <div className="mt-10 flex gap-3">
            <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Retour</Button>
            <Button onClick={next} disabled={uploading}>{uploading ? "Envoi des fichiers…" : `Continuer — ${STEPS[step + 1]}`}</Button>
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="eyebrow">Votre modèle</p>
          {readyPhotos.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {readyPhotos.map((p) =>
                p.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.key} src={p.preview} alt={p.name} className="aspect-square w-full rounded-lg object-cover" />
                ) : (
                  <span key={p.key} className="flex aspect-square items-center justify-center rounded-lg bg-raised font-mono text-xs text-mute">{p.type}</span>
                ),
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-mute">Aucune photo pour l&apos;instant.</p>
          )}
          <p className="mt-3 text-xs text-faint">{mode === "identique" ? "Reproduction du modèle" : "Création inspirée du modèle"} · {quantity} ex.</p>
        </div>
        <EstimateDisplay estimate={estimate.data} loading={estimate.isFetching} compact />
        <p className="text-xs leading-relaxed text-faint">Pour un modèle d&apos;après photo, le prix exact dépend des matières et de la finition : notre équipe le confirme sur votre devis.</p>
      </aside>
    </div>
  );
}
