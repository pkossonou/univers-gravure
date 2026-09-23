"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom"),
  email: z.string().trim().email("Adresse e-mail invalide"),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(190).optional(),
  subject: z.string().trim().max(190).optional(),
  message: z.string().trim().min(10, "Votre message est un peu court (10 caractères minimum)").max(5000),
  website: z.string().max(0).optional(), // pot de miel
});
type Values = z.infer<typeof schema>;

export function ContactPanel() {
  const [sent, setSent] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await api<{ message: string }>("/contact", { method: "POST", body: values });
      setSent(res.message);
    } catch (e) {
      setError("root", { message: e instanceof ApiError ? e.message : "Envoi impossible pour le moment." });
    }
  });

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
      <div className="flex flex-col gap-4">
        {[
          { t: "Estimer un projet", b: "Obtenez une estimation immédiate et envoyez votre demande en quelques clics.", href: "/studio", cta: "Ouvrir le studio" },
          { t: "Suivre une demande", b: "Votre numéro DEM-… et votre e-mail suffisent.", href: "/suivi", cta: "Suivre ma demande" },
          { t: "Espace client", b: "Devis, commandes, factures et fichiers au même endroit.", href: "/compte", cta: "Accéder à mon espace" },
        ].map((c) => (
          <div key={c.t} className="rounded-3xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold text-ink">{c.t}</h2>
            <p className="mt-1 text-sm text-mute">{c.b}</p>
            <ButtonLink href={c.href} variant="outline" size="sm" className="mt-4">{c.cta}</ButtonLink>
          </div>
        ))}
      </div>

      {sent ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-accent/40 bg-accent/5 p-10 text-center" role="status">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-xl text-accent-ink">✓</span>
          <p className="display mt-6 text-3xl text-ink">Message envoyé</p>
          <p className="mt-3 text-mute">{sent}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom" required error={errors.name?.message}>{(p) => <Input {...p} {...register("name")} autoComplete="name" />}</Field>
            <Field label="E-mail" required error={errors.email?.message}>{(p) => <Input {...p} {...register("email")} type="email" autoComplete="email" />}</Field>
            <Field label="Téléphone">{(p) => <Input {...p} {...register("phone")} type="tel" autoComplete="tel" />}</Field>
            <Field label="Entreprise">{(p) => <Input {...p} {...register("company")} autoComplete="organization" />}</Field>
          </div>
          <Field label="Sujet">{(p) => <Input {...p} {...register("subject")} />}</Field>
          <Field label="Message" required error={errors.message?.message}>{(p) => <Textarea {...p} {...register("message")} rows={6} />}</Field>
          <input {...register("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          {errors.root && <p role="alert" className="text-sm text-danger">{errors.root.message}</p>}
          <Button type="submit" size="lg" loading={isSubmitting}>Envoyer le message</Button>
        </form>
      )}
    </div>
  );
}
