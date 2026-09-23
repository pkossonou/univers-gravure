"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { type Column, DataTable, exportCsv } from "@/components/ui/data-table";
import { Checkbox, DatePicker, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Drawer, Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/format";
import { useTable } from "@/lib/hooks";

export interface FormField {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "tel" | "textarea" | "select" | "checkbox" | "date" | "color" | "file" | "url";
  options?: { value: string | number; label: string }[];
  required?: boolean;
  hint?: string;
  span?: 1 | 2;
  /** Champ affiché uniquement à la création */
  createOnly?: boolean;
  accept?: string;
  /** Champ fichier : colonne contenant l'URL du média actuel (aperçu + retrait) */
  previewFrom?: string;
}

type Row = Record<string, unknown> & { id: number };

/**
 * Écran CRUD générique : tableau (recherche, tri, pagination, export), tiroir de création / édition,
 * suppression confirmée. Les boutons n'apparaissent que si l'utilisateur a la permission.
 */
export function ResourceManager<T extends Row>({
  endpoint,
  permission,
  columns,
  fields,
  title,
  singular,
  defaults = {},
  toForm = (r) => r,
  toPayload = (v) => v,
  initialSort = "-created_at",
  filters,
  extraQuery,
  rowActions,
  deleteLabel = "Supprimer",
  onRowClick,
}: {
  endpoint: string;
  permission: string;
  columns: Column<T>[];
  fields: FormField[];
  title: string;
  singular: string;
  defaults?: Record<string, unknown>;
  toForm?: (row: T) => Record<string, unknown>;
  toPayload?: (values: Record<string, unknown>) => Record<string, unknown>;
  initialSort?: string;
  filters?: React.ReactNode;
  extraQuery?: Record<string, string | number | boolean | undefined | null>;
  rowActions?: (row: T) => React.ReactNode;
  deleteLabel?: string;
  onRowClick?: (row: T) => void;
}) {
  const { can } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const { state, setState, query } = useTable<T>(endpoint, initialSort, extraQuery);
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);

  const open = (row: T | "new") => {
    setErrors({});
    setValues(row === "new" ? { ...defaults } : toForm(row));
    setEditing(row);
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const payload = toPayload(values);
      const hasFile = Object.values(payload).some((v) => v instanceof File);
      const isNew = editing === "new";
      const path = isNew ? endpoint : `${endpoint}/${(editing as T).id}`;
      let body: FormData | Record<string, unknown> = payload;
      if (hasFile) {
        const form = new FormData();
        for (const [k, v] of Object.entries(payload)) {
          if (v === null || v === undefined || v === "") continue;
          form.append(k, v instanceof File ? v : typeof v === "boolean" ? (v ? "1" : "0") : String(v));
        }
        if (!isNew) form.append("_method", "PUT");
        body = form;
      }
      await api(path, { method: hasFile ? "POST" : isNew ? "POST" : "PUT", body });
      toast.success(isNew ? `${singular} créé(e)` : `${singular} mis(e) à jour`);
      setEditing(null);
      client.invalidateQueries({ queryKey: [endpoint] });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
        toast.error("Enregistrement impossible", e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      const res = await api<{ message: string }>(`${endpoint}/${deleting.id}`, { method: "DELETE" });
      toast.success(res.message);
      client.invalidateQueries({ queryKey: [endpoint] });
    } catch (e) {
      toast.error("Suppression impossible", e instanceof ApiError ? e.message : undefined);
    } finally {
      setDeleting(null);
    }
  };

  const actionCol: Column<T> = {
    key: "_actions",
    header: "",
    align: "right",
    cell: (row) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {rowActions?.(row)}
        {can(`${permission}.update`) && <Button size="sm" variant="ghost" onClick={() => open(row)}>Modifier</Button>}
        {can(`${permission}.delete`) && <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setDeleting(row)}>{deleteLabel}</Button>}
      </div>
    ),
  };

  const set = (name: string, value: unknown) => setValues((v) => ({ ...v, [name]: value }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">{filters}</div>
        {can(`${permission}.create`) && <Button onClick={() => open("new")}>Nouveau — {singular.toLowerCase()}</Button>}
      </div>
      <DataTable<T>
        columns={[...columns, actionCol]}
        rows={query.data?.data}
        meta={query.data?.meta}
        loading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
        state={state}
        onStateChange={setState}
        rowKey={(r) => r.id}
        onRowClick={onRowClick ?? (can(`${permission}.update`) ? open : undefined)}
        storageKey={endpoint}
        onExport={() => exportCsv(`${title.toLowerCase().replace(/\s+/g, "-")}.csv`, columns.map((c) => c.header), (query.data?.data ?? []).map((r) => columns.map((c) => { const v = c.cell(r); return typeof v === "string" || typeof v === "number" ? v : String(r[c.key] ?? ""); })))}
        empty={{ title: `Aucun(e) ${singular.toLowerCase()}`, action: can(`${permission}.create`) ? <Button size="sm" onClick={() => open("new")}>Créer</Button> : undefined }}
      />

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? `Nouveau — ${singular.toLowerCase()}` : `Modifier — ${singular.toLowerCase()}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
            <Button loading={saving} onClick={save}>Enregistrer</Button>
          </>
        }
      >
        <form className="grid grid-cols-2 gap-4" onSubmit={(e) => (e.preventDefault(), save())}>
          {fields.filter((f) => !(f.createOnly && editing !== "new")).map((f) => (
            <div key={f.name} className={cn(f.span === 1 ? "col-span-2 sm:col-span-1" : "col-span-2")}>
              {f.type === "checkbox" ? (
                <Checkbox label={f.label} checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
              ) : (
                <Field label={f.label} required={f.required} hint={f.hint} error={errors[f.name]}>
                  {(p) =>
                    f.type === "textarea" ? (
                      <Textarea {...p} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} rows={4} />
                    ) : f.type === "select" ? (
                      <Select {...p} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value === "" ? null : e.target.value)}>
                        <option value="">—</option>
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                    ) : f.type === "date" ? (
                      <DatePicker {...p} value={String(values[f.name] ?? "").slice(0, 10)} onChange={(e) => set(f.name, e.target.value)} />
                    ) : f.type === "file" ? (
                      <MediaInput
                        inputProps={p}
                        accept={f.accept}
                        file={values[f.name] instanceof File ? (values[f.name] as File) : null}
                        currentUrl={f.previewFrom ? (values[f.previewFrom] as string | null | undefined) : null}
                        onChange={(file) => set(f.name, file)}
                        onRemove={f.previewFrom ? () => set(f.previewFrom!, null) : undefined}
                      />
                    ) : (
                      <Input
                        {...p}
                        type={f.type ?? "text"}
                        value={String(values[f.name] ?? "")}
                        onChange={(e) => set(f.name, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
                      />
                    )
                  }
                </Field>
              )}
            </div>
          ))}
          <button type="submit" hidden />
        </form>
      </Drawer>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`${deleteLabel} cet élément ?`}
        description="Cette action est tracée dans le journal d'activité."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Annuler</Button>
            <Button variant="danger" onClick={remove}>{deleteLabel}</Button>
          </>
        }
      >
        <p className="text-sm text-mute">Les données liées (historique, documents) sont conservées lorsque c&apos;est applicable.</p>
      </Modal>
    </>
  );
}

/** Champ image / vidéo : aperçu du média actuel ou du fichier choisi, remplacement et retrait. */
function MediaInput({
  inputProps,
  accept,
  file,
  currentUrl,
  onChange,
  onRemove,
}: {
  inputProps: Record<string, unknown>;
  accept?: string;
  file: File | null;
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
  onRemove?: () => void;
}) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const shown = preview ?? currentUrl ?? null;
  const isVideo = file ? file.type.startsWith("video/") : !!shown && /\.(mp4|webm|mov)(\?|$)/i.test(shown);

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-raised text-xs text-faint">
        {shown ? (
          isVideo ? <video src={shown} muted className="size-full object-cover" /> : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="size-full object-cover" />
          )
        ) : "Aucun"}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Input {...inputProps} type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="pt-2.5" />
        <div className="flex gap-3 text-xs">
          {file && <button type="button" className="text-mute hover:text-ink" onClick={() => onChange(null)}>Annuler le nouveau fichier</button>}
          {!file && currentUrl && onRemove && <button type="button" className="text-danger" onClick={onRemove}>Retirer le média actuel</button>}
        </div>
      </div>
    </div>
  );
}
