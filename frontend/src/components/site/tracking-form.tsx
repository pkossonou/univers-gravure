"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Timeline } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { date } from "@/lib/format";
import type { Timeline as TimelineData } from "@/lib/types";

export function TrackingForm() {
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get("numero") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ number: string; created_at: string; timeline: TimelineData } | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!number || !email) return setError("Renseignez le numéro et l'e-mail.");
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: typeof result }>(`/projects/track/${encodeURIComponent(number.trim().toUpperCase())}`, { query: { email: email.trim() } });
      setResult(res.data);
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Recherche impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initialisé après montage (API navigateur ou données serveur)
    if (params.get("numero") && params.get("email")) search();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={search} className="grid items-end gap-4 rounded-3xl border border-line bg-surface p-6 md:grid-cols-[1fr_1fr_auto]">
        <Field label="Numéro de demande">{(p) => <Input {...p} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="DEM-2026-00012" className="font-mono uppercase" />}</Field>
        <Field label="E-mail">{(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}</Field>
        <Button type="submit" size="lg" loading={loading}>Suivre</Button>
      </form>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {result && (
        <div className="rounded-3xl border border-line bg-surface p-6 md:p-10" aria-live="polite">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-sm text-accent-strong">{result.number}</p>
              <p className="display mt-2 text-4xl text-ink">{result.timeline.status_label}</p>
            </div>
            <p className="text-sm text-mute">Demande du {date(result.created_at)}</p>
          </div>
          <Timeline stages={result.timeline.stages} />
        </div>
      )}
    </div>
  );
}
