"use client";

import { useApi } from "@/lib/hooks";

export interface Lookups {
  categories: { id: number; name: string; slug: string }[];
  materials: { id: number; name: string; color_hex?: string }[];
  finishes: { id: number; name: string }[];
  tags: { id: number; name: string; type: string }[];
  expense_categories: { id: number; name: string; color?: string; is_direct_cost: boolean }[];
  suppliers: { id: number; name: string }[];
  staff: { id: number; name: string }[];
  labels: Record<string, Record<string, string>>;
}

/** Listes de référence du back-office (mises en cache 5 min). */
export function useLookups() {
  return useApi<{ data: Lookups }>("/admin/lookups", undefined, { staleTime: 300_000 }).data?.data;
}

export const opts = (list?: { id: number; name: string }[]) => (list ?? []).map((i) => ({ value: i.id, label: i.name }));
export const labelOpts = (map?: Record<string, string>) => Object.entries(map ?? {}).map(([value, label]) => ({ value, label }));

export const CLIENT_TYPES = [
  { value: "particulier", label: "Particulier" },
  { value: "entreprise", label: "Entreprise" },
  { value: "association", label: "Association" },
  { value: "administration", label: "Administration" },
  { value: "etablissement_scolaire", label: "Établissement scolaire" },
];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Virement" },
  { value: "card", label: "Carte bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "other", label: "Autre" },
];
