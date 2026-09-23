"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceChips, Field, Input, Textarea } from "@/components/ui/field";
import { Stepper } from "@/components/ui/primitives";
import { uploadWithProgress } from "@/lib/api";
import { cn } from "@/lib/format";
import { ContactForm, type SubmittedProject, SubmissionSuccess, submitProject } from "./project-submit";

const MODES = [
  { value: "gravure", label: "Gravure", tint: "rgba(40,28,10,.85)", blend: "multiply" },
  { value: "impression", label: "Impression", tint: "#111", blend: "normal" },
  { value: "marquage", label: "Marquage", tint: "#F5F2EB", blend: "normal" },
  { value: "logo", label: "Logo", tint: "#D4AF6A", blend: "normal" },
  { value: "texte", label: "Texte", tint: "#FFFFFF", blend: "difference" },
] as const;

type Mode = (typeof MODES)[number]["value"];

/**
 * MVP « Scannez votre objet » : photo de l'objet (caméra du téléphone), choix du type de personnalisation,
 * simulation 2D déplaçable (texte / logo), puis envoi comme demande de projet avec la photo jointe.
 */
export function ScanStudio() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<{ url: string; file: File } | null>(null);
  const [logo, setLogo] = useState<{ url: string; file: File } | null>(null);
  const [mode, setMode] = useState<Mode>("gravure");
  const [text, setText] = useState("Votre texte ici");
  const [pos, setPos] = useState({ x: 50, y: 55, size: 1 });
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<{ project: SubmittedProject; contact: string } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pickFile = (setter: (v: { url: string; file: File }) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setter({ url: URL.createObjectURL(f), file: f });
  };

  const move = (e: React.PointerEvent) => {
    if (!dragging.current || !stage.current) return;
    const r = stage.current.getBoundingClientRect();
    setPos((p) => ({ ...p, x: Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100)), y: Math.min(95, Math.max(5, ((e.clientY - r.top) / r.height) * 100)) }));
  };

  const style = MODES.find((m) => m.value === mode)!;

  const upload = async (file: File, kind: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const res = await uploadWithProgress<{ data: { token: string } }>("/uploads", form, () => {});
    return res.data.token;
  };

  if (done) return <SubmissionSuccess project={done.project} contact={done.contact} />;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <div
        ref={stage}
        className="relative aspect-[4/5] touch-none overflow-hidden rounded-3xl border border-line bg-surface select-none"
        onPointerMove={move}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
      >
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Votre objet" className="size-full object-cover" />
            <motion.div
              role="img"
              aria-label="Aperçu de la personnalisation — faites glisser pour la déplacer"
              tabIndex={0}
              onPointerDown={(e) => ((dragging.current = true), (e.target as HTMLElement).setPointerCapture?.(e.pointerId))}
              onKeyDown={(e) => {
                const d = 2;
                if (e.key === "ArrowLeft") setPos((p) => ({ ...p, x: p.x - d }));
                if (e.key === "ArrowRight") setPos((p) => ({ ...p, x: p.x + d }));
                if (e.key === "ArrowUp") setPos((p) => ({ ...p, y: p.y - d }));
                if (e.key === "ArrowDown") setPos((p) => ({ ...p, y: p.y + d }));
              }}
              className="absolute cursor-grab text-center active:cursor-grabbing"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(-50%,-50%) scale(${pos.size})`, mixBlendMode: style.blend as React.CSSProperties["mixBlendMode"] }}
            >
              {(mode === "logo" || logo) && logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo.url} alt="" className="pointer-events-none max-h-32 max-w-48 object-contain" style={{ filter: mode === "gravure" ? "grayscale(1) contrast(1.4) brightness(.5)" : undefined }} />
              ) : null}
              {mode !== "logo" && (
                <p className="font-display text-3xl whitespace-nowrap" style={{ color: style.tint, textShadow: mode === "gravure" ? "0 1px 0 rgba(255,255,255,.25)" : undefined }}>
                  {text}
                </p>
              )}
            </motion.div>
            <span className="absolute top-4 left-4 rounded-full bg-ink-950/70 px-3 py-1 font-mono text-[0.65rem] tracking-widest text-brass-200 backdrop-blur">SIMULATION</span>
          </>
        ) : (
          <label className="flex size-full cursor-pointer flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-full border border-accent text-accent" aria-hidden>
              <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            </span>
            <span className="display text-3xl text-ink">Photographiez votre objet</span>
            <span className="max-w-xs text-sm text-mute">Stylo, gourde, plaque, vêtement, trophée existant… Sur mobile, l&apos;appareil photo s&apos;ouvre directement.</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pickFile((v) => (setPhoto(v), setStep(1)))} />
          </label>
        )}
      </div>

      <div>
        <Stepper steps={["Photo", "Personnalisation", "Envoi"]} current={step} onStepClick={setStep} />
        <div className="mt-8 flex flex-col gap-6">
          {step <= 1 && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Type de personnalisation</p>
                <ChoiceChips ariaLabel="Type de personnalisation" options={MODES.map((m) => ({ value: m.value, label: m.label }))} value={mode} onChange={(v) => setMode(v as Mode)} />
              </div>
              {mode !== "logo" && <Field label="Texte">{(p) => <Input {...p} value={text} onChange={(e) => setText(e.target.value)} maxLength={60} />}</Field>}
              <div className="flex flex-wrap items-center gap-3">
                <label className={cn("inline-flex h-11 cursor-pointer items-center rounded-full border border-line-strong px-5 text-sm text-ink hover:border-accent")}>
                  {logo ? "Changer de logo" : "Ajouter un logo"}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={pickFile(setLogo)} />
                </label>
                {photo && (
                  <label className="inline-flex h-11 cursor-pointer items-center rounded-full px-4 text-sm text-mute hover:text-ink">
                    Reprendre la photo
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pickFile(setPhoto)} />
                  </label>
                )}
              </div>
              <Field label={`Taille — ${Math.round(pos.size * 100)} %`}>
                {(p) => <input {...p} type="range" min={0.4} max={2.2} step={0.05} value={pos.size} onChange={(e) => setPos({ ...pos, size: Number(e.target.value) })} className="accent-[var(--accent)]" />}
              </Field>
              <p className="text-xs text-faint">Faites glisser la personnalisation sur la photo (ou utilisez les flèches du clavier). Il s&apos;agit d&apos;une simulation indicative : notre équipe valide la faisabilité et l&apos;emplacement exact sur le BAT.</p>
              <Field label="Précisions (matière de l'objet, quantité…)">{(p) => <Textarea {...p} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />}</Field>
              <Button disabled={!photo} onClick={() => setStep(2)}>Continuer — Envoi</Button>
            </>
          )}
          {step === 2 && photo && (
            <ContactForm
              submitLabel="Envoyer ma simulation"
              onSubmit={async (contact) => {
                const tokens = [await upload(photo.file, "scan")];
                if (logo) tokens.push(await upload(logo.file, "logo"));
                const project = await submitProject({
                  ...contact,
                  channel: "scan",
                  project_type: mode === "gravure" || mode === "marquage" ? "gravure" : "objet",
                  title: "Personnalisation d'un objet (scan)",
                  description: notes || undefined,
                  quantity: 1,
                  personalization: { modes: [mode === "logo" || mode === "texte" ? "gravure" : mode], text: mode !== "logo" ? text : undefined, placement: `x:${Math.round(pos.x)}% y:${Math.round(pos.y)}% échelle:${pos.size}` },
                  file_tokens: tokens,
                });
                setDone({ project, contact: contact.contact_phone });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
