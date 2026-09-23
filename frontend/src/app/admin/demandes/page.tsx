"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageTitle } from "@/components/admin/shell";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/field";
import { Tabs } from "@/components/ui/primitives";
import { date, fcfa } from "@/lib/format";
import { useTable } from "@/lib/hooks";
import { PROJECT_CHANNELS } from "@/lib/site";
import type { Project } from "@/lib/types";

const STATUS_TABS = [
  { value: "open", label: "À traiter", filter: "new,quote_preparing" },
  { value: "sent", label: "Devis envoyés", filter: "quote_sent,awaiting_validation" },
  { value: "validated", label: "Validées", filter: "validated" },
  { value: "closed", label: "Refusées / annulées", filter: "rejected,cancelled" },
  { value: "all", label: "Toutes", filter: undefined },
];

const CHANNELS = PROJECT_CHANNELS;

export default function ProjectsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("open");
  const [channel, setChannel] = useState("");
  const { state, setState, query } = useTable<Project>("/admin/projects", "-created_at", {
    "filter[status]": STATUS_TABS.find((t) => t.value === tab)?.filter,
    "filter[channel]": channel || undefined,
  });
  const counts = (query.data?.meta.counts ?? {}) as Record<string, number>;
  const sum = (keys?: string) => (keys ? keys.split(",").reduce((n, k) => n + (counts[k] ?? 0), 0) : Object.values(counts).reduce((a, b) => a + b, 0));

  return (
    <>
      <PageTitle title="Demandes" description="Projets reçus via le site (studio, configurateur, formulaire, scan) à chiffrer." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs tabs={STATUS_TABS.map((t) => ({ value: t.value, label: t.label, count: sum(t.filter) }))} value={tab} onChange={(v) => (setTab(v), setState({ ...state, page: 1 }))} />
        <Select aria-label="Canal" value={channel} onChange={(e) => setChannel(e.target.value)} className="h-10 w-52">
          <option value="">Tous les canaux</option>
          {Object.entries(CHANNELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>
      <DataTable<Project>
        columns={[
          { key: "number", header: "N°", sort: "number", cell: (p) => <span className="font-mono text-accent-strong">{p.number}</span> },
          { key: "contact", header: "Client", cell: (p) => <span><span className="font-medium">{p.company || p.contact_name}</span><span className="block text-xs text-mute">{p.contact_email}</span></span> },
          { key: "type", header: "Projet", cell: (p) => <span>{p.project_type_label}<span className="block text-xs text-mute">{p.product?.name ?? "Sur mesure"} · {p.quantity} ex.</span></span> },
          { key: "channel", header: "Canal", cell: (p) => <span className="text-mute">{CHANNELS[p.channel] ?? p.channel}</span>, desktopOnly: true },
          { key: "estimate", header: "Estimation", sort: "estimate_min", align: "right", cell: (p) => (p.estimate.min ? fcfa(p.estimate.min) : <span className="text-warning">À étudier</span>) },
          { key: "files", header: "Fichiers", align: "right", cell: (p) => p.files_count ?? 0, desktopOnly: true },
          { key: "status", header: "Statut", sort: "status", cell: (p) => <StatusBadge status={p.status} label={p.status_label} /> },
          { key: "created_at", header: "Reçue", sort: "created_at", cell: (p) => date(p.created_at), desktopOnly: true },
        ]}
        rows={query.data?.data}
        meta={query.data?.meta}
        loading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
        state={state}
        onStateChange={setState}
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/admin/demandes/${p.id}`)}
        searchPlaceholder="N°, nom, e-mail, entreprise…"
        storageKey="projects"
        empty={{ title: "Aucune demande dans cette vue" }}
      />
    </>
  );
}
