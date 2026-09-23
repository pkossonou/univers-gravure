"use client";

import { useState } from "react";
import { opts, PAYMENT_METHODS, useLookups } from "@/components/admin/lookups";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker, Select } from "@/components/ui/field";
import { download } from "@/lib/api";
import { date, fcfa } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Paginated } from "@/lib/types";

interface Expense extends Record<string, unknown> {
  id: number;
  expense_date: string;
  description: string;
  amount: number;
  payment_method: string;
  reference?: string;
  has_receipt: boolean;
  category?: { name: string; color?: string; is_direct_cost: boolean };
  supplier?: { name: string } | null;
  recorder?: { name: string } | null;
  expense_category_id: number;
}

export default function ExpensesPage() {
  const lookups = useLookups();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("sv-SE");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState("");
  const query = { "filter[expense_category_id]": category || undefined, date_from: from || undefined, date_to: to || undefined };
  const total = useApi<Paginated<Expense>>("/admin/expenses", { ...query, per_page: 1 });

  return (
    <>
      <PageTitle title="Dépenses" description={`Total de la sélection : ${fcfa(Number(total.data?.meta.sum ?? 0))}`} actions={
        <Button variant="secondary" size="sm" onClick={() => download("/admin/reports/expenses", { period: "custom", from: from || "2000-01-01", to: to || new Date().toLocaleDateString("sv-SE"), format: "csv" }, "depenses.csv")}>Exporter (Excel)</Button>
      } />
      <ResourceManager<Expense>
        endpoint="/admin/expenses" permission="expenses" title="Dépenses" singular="Dépense" initialSort="-expense_date"
        extraQuery={query}
        filters={
          <>
            <Select aria-label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-52">
              <option value="">Toutes catégories</option>
              {opts(lookups?.expense_categories).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <DatePicker aria-label="Du" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-40" />
            <DatePicker aria-label="Au" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-40" />
          </>
        }
        toForm={(r) => ({ ...r, expense_date: r.expense_date?.slice(0, 10), receipt: null })}
        toPayload={({ expense_date, expense_category_id, supplier_id, order_id, description, amount, payment_method, reference, receipt }) => ({ expense_date, expense_category_id, supplier_id, order_id, description, amount, payment_method, reference, ...(receipt ? { receipt } : {}) })}
        rowActions={(r) => r.has_receipt ? <Button size="sm" variant="ghost" onClick={() => download(`/admin/expenses/${r.id}/receipt`, undefined, `justificatif-${r.id}`)}>Justificatif</Button> : null}
        columns={[
          { key: "expense_date", header: "Date", sort: "expense_date", cell: (r) => date(r.expense_date) },
          { key: "description", header: "Description", cell: (r) => <span><span className="font-medium">{r.description}</span>{r.supplier && <span className="block text-xs text-mute">{r.supplier.name}</span>}</span> },
          { key: "category", header: "Catégorie", cell: (r) => <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: r.category?.color ?? "#999" }} aria-hidden />{r.category?.name}{r.category?.is_direct_cost && <Badge>direct</Badge>}</span> },
          { key: "payment_method", header: "Paiement", cell: (r) => PAYMENT_METHODS.find((p) => p.value === r.payment_method)?.label, desktopOnly: true },
          { key: "amount", header: "Montant", sort: "amount", align: "right", cell: (r) => fcfa(r.amount) },
          { key: "recorder", header: "Saisie par", cell: (r) => r.recorder?.name ?? "—", hidden: true },
        ]}
        defaults={{ expense_date: new Date().toLocaleDateString("sv-SE"), payment_method: "cash" }}
        fields={[
          { name: "expense_date", label: "Date", type: "date", required: true, span: 1 },
          { name: "amount", label: "Montant (FCFA)", type: "number", required: true, span: 1 },
          { name: "expense_category_id", label: "Catégorie", type: "select", options: opts(lookups?.expense_categories), required: true, span: 1 },
          { name: "payment_method", label: "Moyen de paiement", type: "select", options: PAYMENT_METHODS, required: true, span: 1 },
          { name: "description", label: "Description", required: true },
          { name: "supplier_id", label: "Fournisseur", type: "select", options: opts(lookups?.suppliers), span: 1 },
          { name: "reference", label: "Référence (n° facture…)", span: 1 },
          { name: "order_id", label: "Commande liée (ID, coût direct)", type: "number", hint: "Facultatif : imputer la dépense à une commande" },
          { name: "receipt", label: "Justificatif (PDF, JPG, PNG — 10 Mo)", type: "file", accept: ".pdf,.jpg,.jpeg,.png,.webp" },
        ]}
      />
    </>
  );
}
