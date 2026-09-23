"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/schemas";

function safeRedirect(target: string | null, fallback: string) {
  // N'accepte que des chemins internes (anti « open redirect »)
  return target && target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      const user = await login(email, password);
      router.replace(safeRedirect(params.get("redirect"), user.is_staff ? "/admin" : "/compte"));
    } catch (e) {
      setError("root", { message: e instanceof ApiError ? (e.field("email") ?? e.message) : "Connexion impossible." });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field label="E-mail" error={errors.email?.message}>{(p) => <Input {...p} {...register("email")} type="email" autoComplete="email" autoFocus />}</Field>
      <Field label="Mot de passe" error={errors.password?.message}>{(p) => <Input {...p} {...register("password")} type="password" autoComplete="current-password" />}</Field>
      {errors.root && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{errors.root.message}</p>}
      <Button type="submit" size="lg" loading={isSubmitting}>Se connecter</Button>
      <p className="text-center text-sm text-mute">
        Pas encore de compte ? <Link href="/inscription" className="text-accent-strong underline underline-offset-4">Créer mon espace client</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const { register: signup } = useAuth();
  const router = useRouter();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signup({ ...values, phone: values.phone || undefined, company: values.company || undefined });
      router.replace("/compte");
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [field, msgs] of Object.entries(e.errors)) setError(field as keyof typeof values, { message: msgs[0] });
        if (!Object.keys(e.errors).length) setError("root", { message: e.message });
      } else setError("root", { message: "Inscription impossible pour le moment." });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom complet" required error={errors.name?.message}>{(p) => <Input {...p} {...register("name")} autoComplete="name" />}</Field>
        <Field label="E-mail" required error={errors.email?.message}>{(p) => <Input {...p} {...register("email")} type="email" autoComplete="email" />}</Field>
        <Field label="Téléphone" error={errors.phone?.message}>{(p) => <Input {...p} {...register("phone")} type="tel" autoComplete="tel" />}</Field>
        <Field label="Entreprise (facultatif)">{(p) => <Input {...p} {...register("company")} autoComplete="organization" />}</Field>
        <Field label="Mot de passe" required hint="8 caractères, lettres et chiffres" error={errors.password?.message}>{(p) => <Input {...p} {...register("password")} type="password" autoComplete="new-password" />}</Field>
        <Field label="Confirmation" required error={errors.password_confirmation?.message}>{(p) => <Input {...p} {...register("password_confirmation")} type="password" autoComplete="new-password" />}</Field>
      </div>
      <p className="text-xs text-faint">Si vous avez déjà envoyé une demande avec cet e-mail, elle sera automatiquement rattachée à votre espace.</p>
      {errors.root && <p role="alert" className="text-sm text-danger">{errors.root.message}</p>}
      <Button type="submit" size="lg" loading={isSubmitting}>Créer mon espace</Button>
      <p className="text-center text-sm text-mute">
        Déjà inscrit ? <Link href="/connexion" className="text-accent-strong underline underline-offset-4">Se connecter</Link>
      </p>
    </form>
  );
}
