"use client";

import Link from "next/link";
import { useState } from "react";
import { opts, useLookups } from "@/components/admin/lookups";
import { PageTitle } from "@/components/admin/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Drawer } from "@/components/ui/overlay";
import { ErrorState, Skeleton, StatCard } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, date } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";

interface Step { id: number; name: string; status: string; is_client_visible: boolean; completed_at?: string | null }
interface PO {
  id: number;
  number: string;
  status: string;
  priority: string;
  due_at?: string | null;
  progress: number;
  is_late: boolean;
  current_step?: string | null;
  assignee?: { id: number; name: string } | null;
  order: { id: number; number: string; client?: { company?: string; first_name?: string; last_name?: string }; items?: { description: string; quantity: number }[] };
  steps: Step[];
}

const COLUMNS: Record<string, string> = { pending: "À planifier", in_progress: "En cours", paused: "En pause", done: "Terminés (7 j)" };
const PRIORITY = { urgent: ["Urgent", "danger"], high: ["Haute", "warning"], normal: ["Normale", "neutral"], low: ["Basse", "neutral"] } as const;

/** Tableau d'atelier : un ordre de fabrication par carte, avancement étape par étape. */
export default function ProductionPage() {
  const { can } = useAuth();
  const lookups = useLookups();
  const [assignee, setAssignee] = useState("");
  const [open, setOpen] = useState<PO | null>(null);
  const { data, isPending, error, refetch } = useApi<{ data: { columns: { status: string; items: PO[] }[]; stats: Record<string, number> } }>("/admin/production", { assigned_to: assignee || undefined });
  const step = useAction(({ id, status }: { id: number; status: string }) => api<{ data: PO }>(`/admin/production-steps/${id}`, { method: "PATCH", body: { status } }), { invalidate: ["/admin/production", "/admin/orders"] });
  const updatePo = useAction(({ id, body }: { id: number; body: Record<string, unknown> }) => api(`/admin/production/${id}`, { method: "PATCH", body }), { success: "Ordre mis à jour", invalidate: ["/admin/production"] });

  const columns = data?.data.columns ?? [];
  const current = open ? columns.flatMap((c) => c.items).find((p) => p.id === open.id) ?? open : null;
  const clientName = (po: PO) => po.order.client?.company || [po.order.client?.first_name, po.order.client?.last_name].filter(Boolean).join(" ");

  return (
    <>
      <PageTitle
        title="Production"
        description="Ordres de fabrication de l'atelier. Chaque étape validée fait avancer la commande côté client."
        actions={
          <Select aria-label="Filtrer par opérateur" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-10 w-52">
            <option value="">Toute l&apos;équipe</option>
            {opts(lookups?.staff).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        }
      />
      {error ? <ErrorState message={error.message} onRetry={() => refetch()} /> : isPending ? <Skeleton className="h-96 rounded-2xl" /> : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <StatCard label="En cours" value={data?.data.stats.in_progress ?? 0} />
            <StatCard label="En retard" value={data?.data.stats.late ?? 0} tone={(data?.data.stats.late ?? 0) > 0 ? "danger" : "default"} />
            <StatCard label="À livrer cette semaine" value={data?.data.stats.due_this_week ?? 0} />
          </div>
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:px-0">
            {columns.map((col) => (
              <section key={col.status} aria-label={COLUMNS[col.status]} className="w-[82vw] shrink-0 snap-start rounded-2xl border border-line bg-surface/60 p-3 md:w-auto">
                <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-ink">{COLUMNS[col.status]}<span className="font-mono text-xs text-faint">{col.items.length}</span></h2>
                <ul className="flex flex-col gap-2">
                  {col.items.map((po) => (
                    <li key={po.id}>
                      <button type="button" onClick={() => setOpen(po)} className={cn("w-full rounded-xl border bg-raised p-3 text-left transition hover:border-accent", po.is_late ? "border-danger/50" : "border-line")}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-accent-strong">{po.order.number}</span>
                          <Badge tone={PRIORITY[po.priority as keyof typeof PRIORITY]?.[1] ?? "neutral"}>{PRIORITY[po.priority as keyof typeof PRIORITY]?.[0]}</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-ink">{clientName(po)}</p>
                        <p className="truncate text-xs text-mute">{po.order.items?.map((i) => `${i.quantity} × ${i.description}`).join(", ")}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${po.progress}%` }} /></div>
                        <div className="mt-2 flex justify-between font-mono text-[0.68rem]">
                          <span className="text-faint">{po.current_step ?? "—"}</span>
                          <span className={po.is_late ? "text-danger" : "text-faint"}>{date(po.due_at)}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                  {!col.items.length && <li className="px-2 py-6 text-center text-xs text-faint">Vide</li>}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <Drawer open={!!current} onClose={() => setOpen(null)} title={current ? `${current.number} — ${current.order.number}` : ""} description={current ? clientName(current) : undefined}>
        {current && (
          <div className="flex flex-col gap-6">
            <ol className="flex flex-col gap-2">
              {current.steps.map((s) => (
                <li key={s.id} className={cn("flex items-center gap-3 rounded-xl border p-3", s.status === "done" ? "border-success/40 bg-success/5" : s.status === "in_progress" ? "border-accent bg-accent/5" : "border-line")}>
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs", s.status === "done" ? "bg-success text-white" : "border border-line-strong text-mute")}>{s.status === "done" ? "✓" : ""}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{s.name}</p>
                    <p className="font-mono text-[0.65rem] text-faint">{s.is_client_visible ? "Visible client" : "Interne"}{s.completed_at ? ` · ${date(s.completed_at)}` : ""}</p>
                  </div>
                  {can("production.update") && s.status !== "done" && (
                    <div className="flex gap-1">
                      {s.status === "pending" && <Button size="sm" variant="secondary" loading={step.isPending && step.variables?.id === s.id} onClick={() => step.mutate({ id: s.id, status: "in_progress" })}>Démarrer</Button>}
                      <Button size="sm" loading={step.isPending && step.variables?.id === s.id} onClick={() => step.mutate({ id: s.id, status: "done" })}>Terminer</Button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            {can("production.update") && (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">Priorité
                  <Select value={current.priority} onChange={(e) => updatePo.mutate({ id: current.id, body: { priority: e.target.value } })}>
                    {Object.entries(PRIORITY).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
                  </Select>
                </label>
                <label className="grid gap-1 text-sm">Opérateur
                  <Select value={current.assignee?.id ?? ""} onChange={(e) => updatePo.mutate({ id: current.id, body: { assigned_to: e.target.value ? Number(e.target.value) : null } })}>
                    <option value="">—</option>
                    {opts(lookups?.staff).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </label>
              </div>
            )}
            <Link href={`/admin/commandes/${current.order.id}`} className="text-sm text-accent-strong">Voir la commande →</Link>
          </div>
        )}
      </Drawer>
    </>
  );
}
