"use client";

import { useState } from "react";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, Tabs } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface StaffUser extends Record<string, unknown> { id: number; name: string; email: string; phone?: string; role: string; role_label: string; is_active: boolean; last_login_at?: string }

export default function UsersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const roles = useApi<{ data: { role: string; label: string; permissions: string[] }[] }>("/admin/roles");
  const roleOptions = (roles.data?.data ?? []).filter((r) => r.role !== "super_admin" || user?.roles.includes("super_admin")).map((r) => ({ value: r.role, label: r.label }));

  return (
    <>
      <PageTitle title="Utilisateurs & rôles" description="Comptes de l'équipe et permissions par rôle." />
      <Tabs className="mb-6 w-fit" value={tab} onChange={setTab} tabs={[{ value: "users", label: "Équipe" }, { value: "roles", label: "Matrice des droits" }]} />
      {tab === "users" ? (
        <ResourceManager<StaffUser>
          endpoint="/admin/users" permission="users" title="Utilisateurs" singular="Utilisateur" initialSort="name" deleteLabel="Désactiver"
          toForm={(r) => ({ ...r, password: "" })}
          toPayload={({ name, email, phone, role, is_active, password }) => ({ name, email, phone, role, is_active, ...(password ? { password } : {}) })}
          columns={[
            { key: "name", header: "Nom", sort: "name", cell: (u) => <span><span className="font-medium">{u.name}</span><span className="block text-xs text-mute">{u.email}</span></span> },
            { key: "role", header: "Rôle", cell: (u) => <Badge tone="accent">{u.role_label}</Badge> },
            { key: "last_login_at", header: "Dernière connexion", sort: "last_login_at", cell: (u) => dateTime(u.last_login_at), desktopOnly: true },
            { key: "is_active", header: "État", cell: (u) => (u.is_active ? <Badge tone="success" dot>Actif</Badge> : <Badge dot>Désactivé</Badge>) },
          ]}
          defaults={{ role: "commercial", is_active: true }}
          fields={[
            { name: "name", label: "Nom", required: true }, { name: "email", label: "E-mail", type: "email", required: true, span: 1 }, { name: "phone", label: "Téléphone", type: "tel", span: 1 },
            { name: "role", label: "Rôle", type: "select", options: roleOptions, required: true },
            { name: "password", label: "Mot de passe", type: "text", hint: "10 caractères min., lettres et chiffres. Laisser vide pour ne pas changer." },
            { name: "is_active", label: "Compte actif", type: "checkbox" },
          ]}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {roles.data?.data.map((r) => (
            <Card key={r.role}>
              <CardHeader title={r.label} description={`${r.permissions.length} permissions`} />
              <div className="flex flex-wrap gap-1.5 p-5">
                {r.permissions.map((p) => <span key={p} className="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.68rem] text-mute">{p}</span>)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
