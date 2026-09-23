"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Card, ErrorState, Skeleton } from "@/components/ui/primitives";
import { api, download } from "@/lib/api";
import { date, fcfa } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";
import type { Quote } from "@/lib/types";

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [confirm, setConfirm] = useState<"accept" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const { data, isPending, error, refetch } = useApi<{ data: Quote }>(`/me/quotes/${id}`);

  const accept = useAction(() => api<{ message: string; order_id: number }>(`/me/quotes/${id}/accept`, { method: "POST" }), {
    success: (r) => r.message,
    invalidate: ["/me"],
  });
  const reject = useAction(() => api(`/me/quotes/${id}/reject`, { method: "POST", body: { reason } }), { success: "Devis refusé", invalidate: ["/me"] });

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending || !data) return <Skeleton className="h-96 rounded-3xl" />;
  const q = data.data;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/compte/devis" className="font-mono text-xs tracking-widest text-faint hover:text-ink">← MES DEVIS</Link>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-6 md:p-8">
          <div>
            <p className="eyebrow">Devis</p>
            <p className="mt-2 font-mono text-2xl text-ink">{q.number}</p>
            <p className="mt-1 text-sm text-mute">Émis le {date(q.issued_at)} · valable jusqu&apos;au {date(q.valid_until)}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusBadge status={q.status} label={q.status_label} />
            <Button variant="ghost" size="sm" onClick={() => download(`/me/quotes/${q.id}/pdf`, undefined, `${q.number}.pdf`)}>Télécharger le PDF</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[0.68rem] tracking-widest text-faint uppercase">
                <th className="px-6 py-3 font-normal">Désignation</th>
                <th className="px-6 py-3 text-right font-normal">Qté</th>
                <th className="px-6 py-3 text-right font-normal">P.U.</th>
                <th className="px-6 py-3 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {q.items?.map((i) => (
                <tr key={i.id} className="border-b border-line">
                  <td className="px-6 py-4 text-ink">
                    {i.description}
                    {i.options && <p className="mt-1 text-xs text-mute">{Object.entries(i.options).map(([k, v]) => `${k} : ${v}`).join(" · ")}</p>}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-ink">{i.quantity}</td>
                  <td className="px-6 py-4 text-right font-mono text-ink">{fcfa(i.unit_price, false)}</td>
                  <td className="px-6 py-4 text-right font-mono text-ink">{fcfa(i.total ?? 0, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto w-full max-w-xs space-y-2 p-6 text-sm">
          <div className="flex justify-between"><dt className="text-mute">Sous-total</dt><dd className="font-mono text-ink">{fcfa(q.subtotal)}</dd></div>
          {q.discount_amount > 0 && <div className="flex justify-between"><dt className="text-mute">Remise</dt><dd className="font-mono text-success">− {fcfa(q.discount_amount)}</dd></div>}
          {q.tax_amount > 0 && <div className="flex justify-between"><dt className="text-mute">TVA ({q.tax_rate} %)</dt><dd className="font-mono text-ink">{fcfa(q.tax_amount)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-3 text-lg"><dt className="text-ink">Total</dt><dd className="font-mono font-semibold text-ink">{fcfa(q.total)}</dd></div>
        </dl>
        {(q.notes || q.terms) && <div className="border-t border-line p-6 text-sm whitespace-pre-line text-mute">{q.notes}{q.notes && q.terms ? "\n\n" : ""}{q.terms}</div>}
      </Card>

      {q.status === "sent" && (
        <div className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent/5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium text-ink">Ce devis attend votre validation.</p>
            <p className="text-sm text-mute">En l&apos;acceptant, votre commande est créée et planifiée à l&apos;atelier.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirm("reject")}>Refuser</Button>
            <Button onClick={() => setConfirm("accept")}>Accepter le devis</Button>
          </div>
        </div>
      )}
      {q.order && <Link href={`/compte/commandes/${q.order.id}`} className="text-accent-strong underline underline-offset-4">Voir la commande {q.order.number} →</Link>}

      <Modal
        open={confirm === "accept"}
        onClose={() => setConfirm(null)}
        title="Accepter ce devis ?"
        description={`Montant : ${fcfa(q.total)}. Votre commande sera lancée.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Annuler</Button>
            <Button loading={accept.isPending} onClick={() => accept.mutate(undefined, { onSuccess: (r) => router.push(`/compte/commandes/${r.order_id}`) })}>Confirmer</Button>
          </>
        }
      >
        <p className="text-sm text-mute">Un acompte pourra vous être demandé selon les conditions indiquées sur le devis.</p>
      </Modal>
      <Modal
        open={confirm === "reject"}
        onClose={() => setConfirm(null)}
        title="Refuser ce devis"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Annuler</Button>
            <Button variant="danger" loading={reject.isPending} onClick={() => reject.mutate(undefined, { onSuccess: () => setConfirm(null) })}>Refuser</Button>
          </>
        }
      >
        <Field label="Pouvez-vous nous dire pourquoi ? (facultatif)">{(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} rows={3} />}</Field>
      </Modal>
    </div>
  );
}
