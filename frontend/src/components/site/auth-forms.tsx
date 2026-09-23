"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";

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
      await login(email, password);
      router.replace(safeRedirect(params.get("redirect"), "/admin"));
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
    </form>
  );
}
