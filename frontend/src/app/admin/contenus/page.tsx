"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageTitle } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, CardHeader, ErrorState, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";

interface FieldDef {
  key: string;
  label: string;
  section: string;
  multiline: boolean;
  type: "text" | "faq";
}
type Faq = { q: string; a: string }[];
type Content = Record<string, string | Faq | null>;

/** Textes du site modifiables sans développeur : accueil, sections, pied de page, FAQ. */
export default function ContentAdmin() {
  const { data, isPending, error, refetch } = useApi<{ data: Content; fields: FieldDef[] }>("/admin/content");
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending || !data) return <Skeleton className="h-96 rounded-2xl" />;
  // L'éditeur est monté avec les données serveur comme état initial (clé = version chargée)
  return <ContentEditor key={JSON.stringify(data.data)} initial={data.data} fields={data.fields} />;
}

function ContentEditor({ initial, fields }: { initial: Content; fields: FieldDef[] }) {
  const toast = useToast();
  const [values, setValues] = useState<Content>(initial);
  const [saving, setSaving] = useState(false);
  const sections = useMemo(() => [...new Set(fields.map((f) => f.section))], [fields]);
  const faq = (values.faq as Faq) ?? [];

  const save = async () => {
    setSaving(true);
    try {
      const res = await api<{ message: string }>("/admin/content", { method: "PUT", body: { content: values } });
      toast.success("Contenus enregistrés", res.message);
    } catch (e) {
      toast.error("Enregistrement impossible", e instanceof ApiError ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const setFaq = (next: Faq) => setValues({ ...values, faq: next });

  return (
    <>
      <PageTitle
        title="Contenus du site"
        description="Modifiez les textes affichés sur le site public. Les changements apparaissent en ligne en moins d'une minute."
        actions={
          <>
            <Link href="/" target="_blank" className="self-center text-sm text-accent-strong">Voir le site ↗</Link>
            <Button loading={saving} onClick={save}>Enregistrer</Button>
          </>
        }
      />
      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <Card key={section}>
            <CardHeader title={section} />
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {fields.filter((f) => f.section === section).map((f) =>
                f.type === "faq" ? (
                  <div key={f.key} className="flex flex-col gap-3 md:col-span-2">
                    {faq.map((item, i) => (
                      <div key={i} className="grid gap-2 rounded-xl border border-line p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-xs text-faint">Question {i + 1}</span>
                          <span className="flex gap-2 text-xs">
                            <button type="button" disabled={i === 0} className="text-mute hover:text-ink disabled:opacity-30" onClick={() => { const n = [...faq]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setFaq(n); }}>↑ Monter</button>
                            <button type="button" className="text-danger" onClick={() => setFaq(faq.filter((_, k) => k !== i))}>Supprimer</button>
                          </span>
                        </div>
                        <Input aria-label={`Question ${i + 1}`} value={item.q} maxLength={255} onChange={(e) => setFaq(faq.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} placeholder="Question" />
                        <Textarea aria-label={`Réponse ${i + 1}`} value={item.a} maxLength={2000} rows={3} onChange={(e) => setFaq(faq.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} placeholder="Réponse" />
                      </div>
                    ))}
                    <Button variant="secondary" size="sm" className="self-start" onClick={() => setFaq([...faq, { q: "", a: "" }])}>+ Ajouter une question</Button>
                  </div>
                ) : (
                  <Field key={f.key} label={f.label} className={f.multiline ? "md:col-span-2" : undefined}>
                    {(p) =>
                      f.multiline ? (
                        <Textarea {...p} rows={3} maxLength={1000} value={String(values[f.key] ?? "")} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                      ) : (
                        <Input {...p} maxLength={255} value={String(values[f.key] ?? "")} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                      )
                    }
                  </Field>
                ),
              )}
            </div>
          </Card>
        ))}
        <p className="text-sm text-mute">
          Coordonnées (adresse, téléphone, WhatsApp, horaires) : <Link href="/admin/parametres" className="text-accent-strong">Paramètres → Entreprise</Link>. Photos et vidéos : <Link href="/admin/realisations" className="text-accent-strong">Réalisations</Link>. Produits et leurs photos : <Link href="/admin/produits" className="text-accent-strong">Produits</Link>.
        </p>
      </div>
    </>
  );
}
