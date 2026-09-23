"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageTitle } from "@/components/admin/shell";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Tabs } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { date, fcfa } from "@/lib/format";
import { useTable } from "@/lib/hooks";
import type { Quote } from "@/lib/types";

const TABS = [
  { value: "", label: "Tous" }, { value: "draft", label: "Brouillons" }, { value: "sent", label: "Envoyés" },
  { value: "converted", label: "Convertis" }, { value: "rejected,expired", label: "Refusés / expirés" },
];

export default function QuotesPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [status, setStatus] = useState("");
  const { state, setState, query } = useTable<Quote>("/admin/quotes", "-created_at", { "filter[status]": status || undefined });
  const counts = (query.data?.meta.counts ?? {}) as Record<string, number>;
  const pipeline = Number(query.data?.meta.pipeline_total ?? 0);

  return (
    <>
      <PageTitle
        title="Devis"
        description={`Devis envoyés en attente de réponse : ${fcfa(pipeline)}`}
        actions={can("quotes.create") ? <ButtonLink href="/admin/devis/nouveau" size="sm">Nouveau devis</ButtonLink> : undefined}
      />
      <Tabs
        className="mb-4 w-fit max-w-full"
        tabs={TABS.map((t) => ({ ...t, count: t.value ? t.value.split(",").reduce((n, k) => n + (counts[k] ?? 0), 0) : Object.values(counts).reduce((a, b) => a + b, 0) }))}
        value={status}
        onChange={(v) => (setStatus(v), setState({ ...state, page: 1 }))}
      />
      <DataTable<Quote>
        columns={[
          { key: "number", header: "N°", sort: "number", cell: (q) => <span className="font-mono text-accent-strong">{q.number}</span> },
          { key: "client", header: "Client", cell: (q) => q.client?.display_name ?? "—" },
          { key: "project", header: "Demande", cell: (q) => <span className="font-mono text-xs text-mute">{q.project?.number ?? "—"}</span>, desktopOnly: true },
          { key: "total", header: "Montant", sort: "total", align: "right", cell: (q) => fcfa(q.total) },
          { key: "issued_at", header: "Émis", sort: "issued_at", cell: (q) => date(q.issued_at), desktopOnly: true },
          { key: "valid_until", header: "Validité", sort: "valid_until", cell: (q) => date(q.valid_until), desktopOnly: true },
          { key: "status", header: "Statut", sort: "status", cell: (q) => <StatusBadge status={q.status} label={q.status_label} /> },
        ]}
        rows={query.data?.data}
        meta={query.data?.meta}
        loading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
        state={state}
        onStateChange={setState}
        rowKey={(q) => q.id}
        onRowClick={(q) => router.push(`/admin/devis/${q.id}`)}
        searchPlaceholder="N° de devis…"
        storageKey="quotes"
      />
    </>
  );
}
