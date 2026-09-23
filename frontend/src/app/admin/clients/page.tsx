"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CLIENT_TYPES } from "@/components/admin/lookups";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { date, fcfa } from "@/lib/format";

interface ClientRow extends Record<string, unknown> {
  id: number;
  display_name: string;
  type: string;
  email?: string;
  phone?: string;
  city?: string;
  orders_count: number;
  revenue_total?: string | null;
  created_at: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [type, setType] = useState("");
  const [archived, setArchived] = useState(false);

  return (
    <>
      <PageTitle title="Clients" description="Fiches clients, historique commercial et chiffre d'affaires." />
      <ResourceManager<ClientRow>
        endpoint="/admin/clients"
        permission="clients"
        title="Clients"
        singular="Client"
        deleteLabel="Archiver"
        extraQuery={{ "filter[type]": type || undefined, archived: archived || undefined }}
        filters={
          <>
            <Select aria-label="Type de client" value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-52">
              <option value="">Tous les types</option>
              {CLIENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="accent-[var(--accent)]" />Archivés</label>
          </>
        }
        onRowClick={(r) => router.push(`/admin/clients/${r.id}`)}
        columns={[
          { key: "display_name", header: "Client", sort: "company", cell: (r) => <span className="font-medium">{r.display_name}</span> },
          { key: "type", header: "Type", cell: (r) => <Badge>{CLIENT_TYPES.find((t) => t.value === r.type)?.label ?? r.type}</Badge>, desktopOnly: true },
          { key: "email", header: "Contact", cell: (r) => <span className="text-mute">{r.email ?? r.phone ?? "—"}</span>, desktopOnly: true },
          { key: "city", header: "Ville", sort: "city", cell: (r) => r.city ?? "—", hidden: true },
          { key: "orders_count", header: "Commandes", sort: "orders_count", align: "right", cell: (r) => r.orders_count },
          { key: "revenue_total", header: "CA facturé", sort: "revenue_total", align: "right", cell: (r) => fcfa(Number(r.revenue_total ?? 0)) },
          { key: "created_at", header: "Créé le", sort: "created_at", cell: (r) => date(r.created_at), desktopOnly: true },
        ]}
        defaults={{ type: "entreprise", country: "Côte d'Ivoire" }}
        fields={[
          { name: "type", label: "Type", type: "select", options: CLIENT_TYPES, required: true },
          { name: "company", label: "Entreprise / organisation", span: 1 },
          { name: "first_name", label: "Prénom", span: 1 },
          { name: "last_name", label: "Nom", span: 1 },
          { name: "email", label: "E-mail", type: "email", span: 1 },
          { name: "phone", label: "Téléphone", type: "tel", span: 1 },
          { name: "address", label: "Adresse" },
          { name: "city", label: "Ville", span: 1 },
          { name: "country", label: "Pays", span: 1 },
          { name: "source", label: "Source", hint: "Recommandation, salon, site web…" },
          { name: "notes", label: "Notes internes", type: "textarea" },
        ]}
      />
    </>
  );
}
