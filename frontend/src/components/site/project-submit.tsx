"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Timeline } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { fcfa } from "@/lib/format";
import { type ContactValues, contactSchema } from "@/lib/schemas";

export interface SubmittedProject {
  number: string;
  estimate: { min: number | null; max: number | null; confidence: string | null };
  files_count: number;
  tracking_url: string;
}

/** Envoie une demande de projet à l'API ; renvoie le numéro unique. */
export async function submitProject(payload: Record<string, unknown>): Promise<SubmittedProject> {
  const res = await api<{ data: SubmittedProject }>("/projects", { method: "POST", body: payload });
  return res.data;
}

/**
 * Coordonnées + consentement (React Hook Form + Zod). Pas de compte client : le numéro WhatsApp est
 * obligatoire, c'est par là que l'équipe recontacte ; l'e-mail est facultatif.
 * `onSubmit` reçoit les valeurs validées ; les erreurs serveur sont réaffichées sur les champs.
 */
export function ContactForm({ onSubmit, submitLabel = "Envoyer ma demande" }: { onSubmit: (v: ContactValues) => Promise<void>; submitLabel?: string }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { contact_name: "", contact_phone: "", contact_email: "", company: "" },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({ ...values, contact_email: values.contact_email || undefined });
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [field, msgs] of Object.entries(e.errors)) setError(field as keyof ContactValues, { message: msgs[0] });
        setError("root", { message: e.message });
      } else setError("root", { message: "Connexion impossible. Vérifiez votre réseau et réessayez." });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet" required error={errors.contact_name?.message}>{(p) => <Input {...p} {...register("contact_name")} autoComplete="name" />}</Field>
        <Field label="Numéro WhatsApp" required hint="Nous vous recontactons sur WhatsApp" error={errors.contact_phone?.message}>{(p) => <Input {...p} {...register("contact_phone")} type="tel" autoComplete="tel" inputMode="tel" placeholder="07 00 00 00 00" />}</Field>
        <Field label="E-mail" hint="Facultatif" error={errors.contact_email?.message}>{(p) => <Input {...p} {...register("contact_email")} type="email" autoComplete="email" />}</Field>
        <Field label="Entreprise / organisation" error={errors.company?.message}>{(p) => <Input {...p} {...register("company")} autoComplete="organization" />}</Field>
      </div>
      <Checkbox {...register("consent")} label="J'accepte d'être recontacté par UNIVERS GRAVURE (WhatsApp ou téléphone) au sujet de ce projet." />
      {errors.consent && <p role="alert" className="text-sm text-danger">{errors.consent.message}</p>}
      {errors.root && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{errors.root.message}</p>}
      <Button type="submit" size="lg" loading={isSubmitting}>{submitLabel}</Button>
    </form>
  );
}

/** Écran de confirmation : numéro unique, estimation retenue, prochaines étapes. */
export function SubmissionSuccess({ project, contact }: { project: SubmittedProject; contact?: string }) {
  const stages = [
    { key: "request", label: "Demande", state: "done" as const },
    { key: "quote", label: "Devis", state: "current" as const },
    { key: "validation", label: "Validation", state: "upcoming" as const },
    { key: "production", label: "Production", state: "upcoming" as const },
    { key: "delivery", label: "Remise", state: "upcoming" as const },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center" role="status">
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-2xl text-accent-ink">
        ✓
      </motion.span>
      <p className="eyebrow mt-8">Demande enregistrée</p>
      <h2 className="display mt-4 text-4xl text-ink md:text-5xl">Merci, votre projet est entre de bonnes mains.</h2>
      <p className="mt-6 text-mute">
        Votre numéro de demande : <span className="font-mono text-lg text-accent-strong">{project.number}</span>
      </p>
      {project.estimate.min && (
        <p className="mt-2 text-sm text-mute">
          Estimation retenue : {project.estimate.confidence === "from" ? "à partir de " : ""}
          {fcfa(project.estimate.min)} — confirmée sur votre devis.
        </p>
      )}
      {project.files_count > 0 && <p className="mt-1 text-sm text-mute">{project.files_count} fichier(s) joint(s) à votre demande.</p>}
      <p className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 px-5 py-4 text-sm text-ink">
        Notre équipe vous contacte sur WhatsApp{contact ? <> au <span className="font-mono">{contact}</span></> : null} pour affiner votre projet et vous envoyer le devis.
      </p>
      <div className="mt-10 rounded-3xl border border-line bg-surface p-6 text-left">
        <Timeline stages={stages} />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={`/suivi?numero=${project.number}${contact ? `&contact=${encodeURIComponent(contact)}` : ""}`}>Suivre ma demande</ButtonLink>
        <ButtonLink href="/" variant="outline">Retour à l&apos;accueil</ButtonLink>
      </div>
    </motion.div>
  );
}
