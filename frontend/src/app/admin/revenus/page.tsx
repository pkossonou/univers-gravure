"use client";

import { opts, PAYMENT_METHODS, useLookups } from "@/components/admin/lookups";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { date, fcfa } from "@/lib/format";

interface Revenue extends Record<string, unknown> {
  id: number;
  revenue_date: string;
  description: string;
  amount: number;
  source: string;
  payment_method: string;
  client?: { company?: string; first_name?: string; last_name?: string } | null;
  category?: { name: string } | null;
}

const SOURCES = [{ value: "vente_comptoir", label: "Vente comptoir" }, { value: "prestation", label: "Prestation" }, { value: "autre", label: "Autre" }];

export default function RevenuesPage() {
  const lookups = useLookups();
  return (
    <>
      <PageTitle title="Revenus hors facture" description="Ventes comptoir et prestations ponctuelles. Les factures émises sont comptabilisées automatiquement dans le CA." />
      <ResourceManager<Revenue>
        endpoint="/admin/revenues" permission="revenues" title="Revenus" singular="Recette" initialSort="-revenue_date"
        toForm={(r) => ({ ...r, revenue_date: r.revenue_date?.slice(0, 10) })}
        toPayload={({ revenue_date, client_id, order_id, category_id, source, description, amount, payment_method, reference }) => ({ revenue_date, client_id, order_id, category_id, source, description, amount, payment_method, reference })}
        columns={[
          { key: "revenue_date", header: "Date", sort: "revenue_date", cell: (r) => date(r.revenue_date) },
          { key: "description", header: "Description", cell: (r) => r.description },
          { key: "source", header: "Origine", cell: (r) => SOURCES.find((s) => s.value === r.source)?.label },
          { key: "category", header: "Catégorie", cell: (r) => r.category?.name ?? "—", desktopOnly: true },
          { key: "payment_method", header: "Paiement", cell: (r) => PAYMENT_METHODS.find((p) => p.value === r.payment_method)?.label, desktopOnly: true },
          { key: "amount", header: "Montant", sort: "amount", align: "right", cell: (r) => fcfa(r.amount) },
        ]}
        defaults={{ revenue_date: new Date().toLocaleDateString("sv-SE"), source: "vente_comptoir", payment_method: "cash" }}
        fields={[
          { name: "revenue_date", label: "Date", type: "date", required: true, span: 1 }, { name: "amount", label: "Montant (FCFA)", type: "number", required: true, span: 1 },
          { name: "description", label: "Description", required: true },
          { name: "source", label: "Origine", type: "select", options: SOURCES, required: true, span: 1 }, { name: "payment_method", label: "Paiement", type: "select", options: PAYMENT_METHODS, required: true, span: 1 },
          { name: "category_id", label: "Catégorie de produit", type: "select", options: opts(lookups?.categories), span: 1 }, { name: "reference", label: "Référence", span: 1 },
        ]}
      />
    </>
  );
}
