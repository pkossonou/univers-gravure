"use client";

import { useEffect, useState } from "react";
import { labelOpts, useLookups } from "@/components/admin/lookups";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, CardHeader, Tabs } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime, fcfa } from "@/lib/format";
import { useAction, useApi, useTable } from "@/lib/hooks";

type Tab = "company" | "pricing" | "expenses" | "journal";
type R = Record<string, unknown> & { id: number };

const COMPANY_FIELDS: [string, string, boolean?][] = [
  ["company.address", "Adresse"], ["company.phone", "Téléphone"], ["company.email", "E-mail"], ["company.whatsapp", "WhatsApp"],
  ["company.rccm", "RCCM / identifiants légaux"], ["company.opening_hours", "Horaires"], ["quotes.validity_days", "Validité des devis (jours)"],
  ["quotes.default_tax_rate", "TVA par défaut (%)"], ["quotes.default_terms", "Conditions par défaut des devis", true],
];

const RULE_TYPES = [
  { value: "category_base", label: "Prix de départ (projet sans produit)" }, { value: "quantity_tier", label: "Remise quantité" },
  { value: "personalization", label: "Personnalisation (par pièce)" }, { value: "setup", label: "Frais fixes" }, { value: "urgency", label: "Délai (majoration/remise)" },
];

export default function SettingsPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState<Tab>("company");
  const tabs = [
    { value: "company" as const, label: "Entreprise" },
    ...(can("pricing.manage") ? [{ value: "pricing" as const, label: "Règles tarifaires" }] : []),
    { value: "expenses" as const, label: "Catégories de dépenses" },
    { value: "journal" as const, label: "Journal d'activité" },
  ];

  return (
    <>
      <PageTitle title="Paramètres" description="Informations société, moteur de prix, référentiel comptable et audit." />
      <Tabs className="mb-6 w-fit max-w-full" value={tab} onChange={setTab} tabs={tabs} />
      {tab === "company" && <CompanySettings />}
      {tab === "pricing" && <PricingRules />}
      {tab === "expenses" && (
        <ResourceManager<R>
          endpoint="/admin/expense-categories" permission="expenses" title="Catégories de dépenses" singular="Catégorie" initialSort="name"
          columns={[
            { key: "name", header: "Catégorie", sort: "name", cell: (r) => <span className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: String(r.color ?? "#999") }} />{String(r.name)}</span> },
            { key: "direct", header: "Coût direct", cell: (r) => (r.is_direct_cost ? <Badge tone="accent">Marge brute</Badge> : "Structure") },
            { key: "recurring", header: "Récurrente", cell: (r) => (r.is_recurring ? <Badge tone="info">Mensuelle attendue</Badge> : "—") },
            { key: "count", header: "Dépenses", align: "right", cell: (r) => Number(r.expenses_count ?? 0) },
          ]}
          defaults={{ is_active: true }}
          fields={[
            { name: "name", label: "Nom", required: true }, { name: "color", label: "Couleur (#RRGGBB)" },
            { name: "is_direct_cost", label: "Coût direct (entre dans la marge brute)", type: "checkbox" },
            { name: "is_recurring", label: "Charge récurrente mensuelle (contrôle de complétude du résultat)", type: "checkbox" },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      )}
      {tab === "journal" && <Journal />}
    </>
  );
}

function CompanySettings() {
  const { data } = useApi<{ data: Record<string, unknown> }>("/admin/settings");
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
    if (data) setValues(Object.fromEntries(Object.entries(data.data).map(([k, v]) => [k, String(v ?? "")])));
  }, [data]);
  const save = useAction(() => api("/admin/settings", { method: "PUT", body: { settings: values } }), { success: "Paramètres enregistrés" });

  return (
    <Card>
      <CardHeader title="Société" description="Utilisé sur les devis, factures et certificats PDF" />
      <form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
        {COMPANY_FIELDS.map(([key, label, long]) => (
          <Field key={key} label={label} className={long ? "md:col-span-2" : undefined}>
            {(p) => (long ? <Textarea {...p} rows={3} value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} /> : <Input {...p} value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />)}
          </Field>
        ))}
        <Button type="submit" loading={save.isPending} className="justify-self-start">Enregistrer</Button>
      </form>
    </Card>
  );
}

function PricingRules() {
  const lookups = useLookups();
  const describe = (r: R) => {
    const c = (r.conditions ?? {}) as Record<string, unknown>;
    return [c.project_type && `type ${c.project_type}`, c.min_qty && `≥ ${c.min_qty}`, c.max_qty && `≤ ${c.max_qty}`, c.urgency && `délai ${c.urgency}`, c.personalization && String(c.personalization), c.when && `si ${c.when}`, c.per === "m2" && "au m²"].filter(Boolean).join(" · ");
  };
  return (
    <>
      <p className="mb-4 max-w-3xl text-sm text-mute">Ces règles alimentent l&apos;estimation affichée sur le site (configurateur, studio, calculateur, fiches produits). Toute modification s&apos;applique immédiatement.</p>
      <ResourceManager<R>
        endpoint="/admin/pricing-rules" permission="pricing" title="Règles tarifaires" singular="Règle" initialSort="type"
        toForm={(r) => ({ ...r, ...((r.conditions ?? {}) as object) })}
        toPayload={(v) => ({
          name: v.name, type: v.type, amount: Number(v.amount), amount_type: v.amount_type, priority: v.priority ?? 0, is_active: v.is_active,
          conditions: Object.fromEntries(["project_type", "min_qty", "max_qty", "urgency", "personalization", "when", "per"].filter((k) => v[k] !== undefined && v[k] !== null && v[k] !== "").map((k) => [k, ["min_qty", "max_qty"].includes(k) ? Number(v[k]) : v[k]])),
        })}
        columns={[
          { key: "name", header: "Règle", sort: "name", cell: (r) => <span className="font-medium">{String(r.name)}</span> },
          { key: "type", header: "Type", sort: "type", cell: (r) => RULE_TYPES.find((t) => t.value === r.type)?.label },
          { key: "conditions", header: "Conditions", cell: (r) => <span className="text-mute">{describe(r) || "—"}</span> },
          { key: "amount", header: "Valeur", align: "right", cell: (r) => (r.amount_type === "percent" ? `${Number(r.amount)} %` : fcfa(Number(r.amount))) },
          { key: "is_active", header: "", cell: (r) => (r.is_active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>) },
        ]}
        defaults={{ type: "quantity_tier", amount_type: "percent", is_active: true, priority: 0 }}
        fields={[
          { name: "name", label: "Libellé (affiché dans le détail de l'estimation)", required: true },
          { name: "type", label: "Type", type: "select", options: RULE_TYPES, required: true, span: 1 },
          { name: "amount_type", label: "Nature", type: "select", options: [{ value: "percent", label: "Pourcentage" }, { value: "fixed", label: "Montant fixe" }, { value: "per_unit", label: "Par pièce" }], required: true, span: 1 },
          { name: "amount", label: "Valeur", type: "number", required: true, hint: "Négatif pour une remise de délai", span: 1 },
          { name: "priority", label: "Priorité", type: "number", span: 1 },
          { name: "project_type", label: "Condition : type de projet", type: "select", options: labelOpts(lookups?.labels.project_types), span: 1 },
          { name: "per", label: "Unité (prix de départ)", type: "select", options: [{ value: "unit", label: "Par pièce" }, { value: "m2", label: "Au m²" }], span: 1 },
          { name: "min_qty", label: "Condition : quantité min.", type: "number", span: 1 },
          { name: "max_qty", label: "Condition : quantité max.", type: "number", span: 1 },
          { name: "urgency", label: "Condition : délai", type: "select", options: [{ value: "flexible", label: "Flexible" }, { value: "standard", label: "Standard" }, { value: "express", label: "Express" }], span: 1 },
          { name: "personalization", label: "Condition : technique", type: "select", options: ["gravure", "impression", "uv", "sublimation", "marquage", "broderie", "decoupe"].map((v) => ({ value: v, label: v })), span: 1 },
          { name: "when", label: "Frais fixes : quand", type: "select", options: [{ value: "always", label: "Toujours" }, { value: "logo", label: "Si un logo est fourni" }] },
          { name: "is_active", label: "Règle active", type: "checkbox" },
        ]}
      />
    </>
  );
}

function Journal() {
  const { state, setState, query } = useTable<{ id: number; action: string; description?: string; user?: { name: string }; ip_address?: string; created_at: string; subject_type?: string; subject_id?: number }>("/admin/activity", "-created_at");
  return (
    <DataTable
      columns={[
        { key: "created_at", header: "Date", sort: "created_at", cell: (r) => <span className="font-mono text-xs">{dateTime(r.created_at)}</span> },
        { key: "user", header: "Utilisateur", cell: (r) => r.user?.name ?? "Système / visiteur" },
        { key: "action", header: "Action", cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
        { key: "description", header: "Détail", cell: (r) => <span className="text-mute">{r.description ?? (r.subject_type ? `${r.subject_type.split("\\").pop()} #${r.subject_id}` : "—")}</span> },
        { key: "ip", header: "IP", cell: (r) => <span className="font-mono text-xs text-faint">{r.ip_address ?? "—"}</span>, desktopOnly: true },
      ]}
      rows={query.data?.data} meta={query.data?.meta} loading={query.isPending} error={query.error} onRetry={() => query.refetch()}
      state={state} onStateChange={setState} rowKey={(r) => r.id} searchPlaceholder="Action, détail…"
    />
  );
}
