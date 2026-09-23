"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { opts, useLookups } from "@/components/admin/lookups";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date, fcfa } from "@/lib/format";
import { useAction } from "@/lib/hooks";

const STATUSES = [
  { value: "new", label: "Nouveau" }, { value: "contacted", label: "Contacté" }, { value: "qualified", label: "Qualifié" },
  { value: "converted", label: "Converti" }, { value: "lost", label: "Perdu" },
];

interface Lead extends Record<string, unknown> {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: string;
  source?: string;
  interest?: string;
  estimated_value?: number;
  assignee?: { name: string };
  converted_client_id?: number;
  created_at: string;
}

export default function LeadsPage() {
  const lookups = useLookups();
  const router = useRouter();
  const { can } = useAuth();
  const client = useQueryClient();
  const [status, setStatus] = useState("all");
  const convert = useAction((id: number) => api<{ data: { id: number } }>(`/admin/leads/${id}/convert`, { method: "POST" }), { success: "Prospect converti en client" });

  return (
    <>
      <PageTitle title="Prospects" description="Contacts entrants (formulaire, salons, recommandations) à qualifier puis convertir." />
      <ResourceManager<Lead>
        endpoint="/admin/leads"
        permission="leads"
        title="Prospects"
        singular="Prospect"
        extraQuery={{ "filter[status]": status === "all" ? undefined : status }}
        filters={<Tabs tabs={[{ value: "all", label: "Tous" }, ...STATUSES]} value={status} onChange={setStatus} />}
        columns={[
          { key: "name", header: "Prospect", sort: "name", cell: (r) => <span><span className="font-medium">{r.name}</span>{r.company && <span className="block text-xs text-mute">{r.company}</span>}</span> },
          { key: "interest", header: "Intérêt", cell: (r) => r.interest ?? "—", desktopOnly: true },
          { key: "estimated_value", header: "Potentiel", sort: "estimated_value", align: "right", cell: (r) => (r.estimated_value ? fcfa(r.estimated_value) : "—") },
          { key: "source", header: "Source", cell: (r) => r.source ?? "—", desktopOnly: true },
          { key: "status", header: "Statut", sort: "status", cell: (r) => <StatusBadge status={r.status} label={STATUSES.find((s) => s.value === r.status)?.label} /> },
          { key: "created_at", header: "Reçu", sort: "created_at", cell: (r) => date(r.created_at), desktopOnly: true },
        ]}
        rowActions={(r) =>
          r.converted_client_id ? (
            <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/clients/${r.converted_client_id}`)}>Fiche client</Button>
          ) : can("clients.create") ? (
            <Button size="sm" variant="secondary" loading={convert.isPending && convert.variables === r.id} onClick={() => convert.mutate(r.id, { onSuccess: (res) => { client.invalidateQueries({ queryKey: ["/admin/leads"] }); router.push(`/admin/clients/${res.data.id}`); } })}>
              Convertir
            </Button>
          ) : null
        }
        defaults={{ status: "new" }}
        fields={[
          { name: "name", label: "Nom", required: true, span: 1 },
          { name: "company", label: "Entreprise", span: 1 },
          { name: "email", label: "E-mail", type: "email", span: 1 },
          { name: "phone", label: "Téléphone", type: "tel", span: 1 },
          { name: "status", label: "Statut", type: "select", options: STATUSES, required: true, span: 1 },
          { name: "source", label: "Source", span: 1 },
          { name: "interest", label: "Intérêt / besoin" },
          { name: "estimated_value", label: "Potentiel estimé (FCFA)", type: "number", span: 1 },
          { name: "assigned_to", label: "Suivi par", type: "select", options: opts(lookups?.staff), span: 1 },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
      />
    </>
  );
}
