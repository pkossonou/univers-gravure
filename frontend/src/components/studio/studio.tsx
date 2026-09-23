"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EstimateDisplay, useEstimate } from "@/components/site/estimate-panel";
import { ContactForm, type SubmittedProject, SubmissionSuccess, submitProject } from "@/components/site/project-submit";
import { Button } from "@/components/ui/button";
import { ChoiceChips, Field, Input, Textarea } from "@/components/ui/field";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Stepper } from "@/components/ui/primitives";
import { cn } from "@/lib/format";
import { PERSONALIZATION_LABELS } from "@/lib/visuals";

const ease = [0.22, 1, 0.36, 1] as const;

/** Les 5 univers de la fonctionnalité signature « Donnez vie à votre idée ». */
const UNIVERSES = [
  { value: "trophee", label: "Trophée", visual: "/visuals/trophy-cup-gold.svg", line: "Coupes, étoiles, cristal", to: "/configurateur?type=trophees" },
  { value: "medaille", label: "Médaille", visual: "/visuals/medal-gold.svg", line: "Frappées, acryliques, rubans", to: "/configurateur?type=medailles" },
  { value: "gravure", label: "Gravure", visual: "/visuals/wood-engraving.svg", line: "Sur bois, métal, verre, cuir" },
  { value: "impression", label: "Impression", visual: "/visuals/banner.svg", line: "Grand format, UV, PLV" },
  { value: "objet", label: "Objet personnalisé", visual: "/visuals/mug.svg", line: "Mugs, textiles, goodies, cadeaux" },
] as const;

type Universe = (typeof UNIVERSES)[number]["value"];

const MODES: Record<string, string[]> = {
  gravure: ["gravure", "marquage"],
  impression: ["impression", "uv"],
  objet: ["sublimation", "impression", "gravure"],
};

const STEPS = ["Votre idée", "Format", "Personnalisation", "Délai", "Envoi"];

export function Studio({ initial }: { initial?: string }) {
  const router = useRouter();
  const [universe, setUniverse] = useState<Universe | null>((UNIVERSES.find((u) => u.value === initial && !("to" in u))?.value as Universe) ?? null);
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState({ title: "", description: "" });
  const [format, setFormat] = useState({ quantity: 1, width: "", height: "" });
  const [modes, setModes] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [urgency, setUrgency] = useState<"flexible" | "standard" | "express">("standard");
  const [done, setDone] = useState<{ project: SubmittedProject; email: string } | null>(null);

  const estimate = useEstimate(
    {
      project_type: universe,
      quantity: format.quantity,
      width_mm: Number(format.width) || null,
      height_mm: Number(format.height) || null,
      personalizations: modes,
      has_logo: files.some((f) => f.status === "done"),
      urgency,
    },
    !!universe,
  );

  const choose = (u: (typeof UNIVERSES)[number]) => {
    if ("to" in u) return router.push(u.to);
    setUniverse(u.value);
    setModes(MODES[u.value]?.slice(0, 1) ?? []);
    setStep(0);
  };

  if (done) return <div className="container-x py-32"><SubmissionSuccess project={done.project} email={done.email} /></div>;

  // Écran 1 : choix immersif de l'univers
  if (!universe) {
    return (
      <section className="relative flex min-h-dvh flex-col justify-center overflow-hidden pt-28 pb-16">
        <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" aria-hidden />
        <div className="container-x relative">
          <motion.p className="eyebrow text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Donnez vie à votre idée</motion.p>
          <motion.h1 className="display mx-auto mt-5 max-w-4xl text-center text-[clamp(2.4rem,6vw,5.5rem)] text-ink" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease }}>
            Que voulez-vous <span className="metal-text italic">créer</span> ?
          </motion.h1>
          <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-5">
            {UNIVERSES.map((u, i) => (
              <motion.button
                key={u.value}
                type="button"
                onClick={() => choose(u)}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.8, ease }}
                whileHover={{ y: -8 }}
                className={cn("group relative overflow-hidden rounded-3xl border border-line bg-surface text-left transition-colors hover:border-accent/60", i === 4 && "col-span-2 md:col-span-1")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.visual} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-signature)] group-hover:scale-110" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent p-5 pt-20">
                  <p className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</p>
                  <p className="display mt-1 text-2xl text-paper-50 md:text-3xl">{u.label}</p>
                  <p className="mt-1 text-xs text-steel-400">{u.line}</p>
                </div>
              </motion.button>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-mute">
            Autre chose en tête ? <Link href="/devis?type=autre" className="text-accent-strong underline underline-offset-4">Décrivez votre projet sur mesure</Link> · <Link href="/scan" className="text-accent-strong underline underline-offset-4">Photographiez votre objet</Link>
          </p>
        </div>
      </section>
    );
  }

  const current = UNIVERSES.find((u) => u.value === universe)!;
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  return (
    <section className="container-x grid min-h-dvh gap-10 pt-28 pb-16 lg:grid-cols-[1fr_380px] lg:pt-32">
      <div>
        <button type="button" onClick={() => setUniverse(null)} className="mb-6 font-mono text-xs tracking-widest text-faint hover:text-ink">← CHANGER D&apos;UNIVERS</button>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.visual} alt="" className="size-16 rounded-2xl border border-line object-cover" />
          <div>
            <p className="eyebrow">Studio — {current.label}</p>
            <h1 className="display mt-1 text-4xl text-ink">Votre projet de {current.label.toLowerCase()}</h1>
          </div>
        </div>
        <div className="mt-10"><Stepper steps={STEPS} current={step} onStepClick={setStep} /></div>

          <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }} className="mt-10">
            {step === 0 && (
              <div className="flex flex-col gap-5">
                <Field label="Donnez un nom à votre projet" hint="Ex. : Gourdes gravées pour notre séminaire">
                  {(p) => <Input {...p} value={idea.title} onChange={(e) => setIdea({ ...idea, title: e.target.value })} maxLength={190} />}
                </Field>
                <Field label="Décrivez votre idée" hint="Usage, occasion, style souhaité… Plus c'est précis, plus le devis est juste.">
                  {(p) => <Textarea {...p} rows={5} value={idea.description} onChange={(e) => setIdea({ ...idea, description: e.target.value })} maxLength={5000} />}
                </Field>
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Quantité" required>{(p) => <Input {...p} type="number" min={1} value={format.quantity} onChange={(e) => setFormat({ ...format, quantity: Math.max(1, Number(e.target.value) || 1) })} inputMode="numeric" />}</Field>
                <Field label="Largeur (mm)" hint={universe === "impression" ? "Nécessaire pour l'impression" : "Facultatif"}>{(p) => <Input {...p} type="number" min={5} value={format.width} onChange={(e) => setFormat({ ...format, width: e.target.value })} />}</Field>
                <Field label="Hauteur (mm)">{(p) => <Input {...p} type="number" min={5} value={format.height} onChange={(e) => setFormat({ ...format, height: e.target.value })} />}</Field>
              </div>
            )}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Technique</p>
                  <ChoiceChips multiple ariaLabel="Technique de personnalisation" options={(MODES[universe] ?? []).map((m) => ({ value: m, label: PERSONALIZATION_LABELS[m] }))} value={modes} onChange={(v) => setModes(v as string[])} />
                </div>
                <Field label="Texte à reproduire" hint="Nom, slogan, date…">{(p) => <Input {...p} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />}</Field>
                <FileUploader onChange={setFiles} kind="logo" label="Déposez votre logo ou maquette" compact />
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-3">
                {([["flexible", "Flexible", "Je ne suis pas pressé — remise appliquée"], ["standard", "Standard", "Délai habituel de l'atelier"], ["express", "Express", "Délai réduit, majoration appliquée"]] as const).map(([v, l, h]) => (
                  <button key={v} type="button" aria-pressed={urgency === v} onClick={() => setUrgency(v)} className={cn("rounded-2xl border p-5 text-left transition", urgency === v ? "border-accent bg-accent/5" : "border-line hover:border-line-strong")}>
                    <p className="font-medium text-ink">{l}</p>
                    <p className="text-sm text-mute">{h}</p>
                  </button>
                ))}
              </div>
            )}
            {step === 4 && (
              <ContactForm
                onSubmit={async (contact) => {
                  const project = await submitProject({
                    ...contact,
                    channel: "studio",
                    project_type: universe,
                    title: idea.title || undefined,
                    description: idea.description || undefined,
                    quantity: format.quantity,
                    width_mm: Number(format.width) || undefined,
                    height_mm: Number(format.height) || undefined,
                    urgency,
                    personalization: { modes, text: text || undefined },
                    file_tokens: files.filter((f) => f.token).map((f) => f.token),
                  });
                  setDone({ project, email: contact.contact_email });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </motion.div>

        {step < 4 && (
          <div className="mt-10 flex gap-3">
            <Button variant="secondary" onClick={() => (step === 0 ? setUniverse(null) : setStep(step - 1))}>Retour</Button>
            <Button onClick={next}>Continuer — {STEPS[step + 1]}</Button>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <EstimateDisplay estimate={estimate.data} loading={estimate.isFetching} />
        <p className="mt-4 text-xs leading-relaxed text-faint">Cette estimation est calculée par nos règles tarifaires et se met à jour à chaque choix. Notre équipe confirme le prix définitif sur votre devis.</p>
      </aside>
    </section>
  );
}
