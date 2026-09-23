"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Profile() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    company: user?.client?.company ?? "",
    address: user?.client?.address ?? "",
    city: user?.client?.city ?? "",
  });
  const [pwd, setPwd] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"profile" | "password" | null>(null);

  const save = async (kind: "profile" | "password") => {
    setSaving(kind);
    setErrors({});
    try {
      if (kind === "profile") {
        await api("/auth/profile", { method: "PUT", body: profile });
        await refresh();
        toast.success("Profil mis à jour");
      } else {
        await api("/auth/password", { method: "PUT", body: pwd });
        setPwd({ current_password: "", password: "", password_confirmation: "" });
        toast.success("Mot de passe modifié", "Vos autres sessions ont été déconnectées.");
      }
    } catch (e) {
      if (e instanceof ApiError) setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Mes informations" description={user?.email} />
        <form className="grid gap-4 p-5" onSubmit={(e) => (e.preventDefault(), save("profile"))}>
          <Field label="Nom" error={errors.name}>{(p) => <Input {...p} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} autoComplete="name" />}</Field>
          <Field label="Téléphone" error={errors.phone}>{(p) => <Input {...p} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} type="tel" />}</Field>
          <Field label="Entreprise">{(p) => <Input {...p} value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />}</Field>
          <Field label="Adresse">{(p) => <Input {...p} value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} autoComplete="street-address" />}</Field>
          <Field label="Ville">{(p) => <Input {...p} value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />}</Field>
          <Button type="submit" loading={saving === "profile"} className="justify-self-start">Enregistrer</Button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Sécurité" description="Changez votre mot de passe" />
        <form className="grid gap-4 p-5" onSubmit={(e) => (e.preventDefault(), save("password"))}>
          <Field label="Mot de passe actuel" error={errors.current_password}>{(p) => <Input {...p} type="password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} autoComplete="current-password" />}</Field>
          <Field label="Nouveau mot de passe" error={errors.password} hint="8 caractères, lettres et chiffres">{(p) => <Input {...p} type="password" value={pwd.password} onChange={(e) => setPwd({ ...pwd, password: e.target.value })} autoComplete="new-password" />}</Field>
          <Field label="Confirmation">{(p) => <Input {...p} type="password" value={pwd.password_confirmation} onChange={(e) => setPwd({ ...pwd, password_confirmation: e.target.value })} autoComplete="new-password" />}</Field>
          <Button type="submit" variant="secondary" loading={saving === "password"} className="justify-self-start">Modifier le mot de passe</Button>
        </form>
      </Card>
    </div>
  );
}
