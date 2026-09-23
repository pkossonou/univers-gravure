"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle } from "@/components/admin/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker, Field, Input } from "@/components/ui/field";
import { Drawer } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, download } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date } from "@/lib/format";
import { useAction, useTable } from "@/lib/hooks";

interface Cert { id: number; number: string; recipient_name: string; award_title: string; event_name?: string; organization?: string; issued_on: string; is_revoked: boolean; verify_url: string; qr_code?: { code: string } | null }

export default function CertificatesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const { state, setState, query } = useTable<Cert>("/admin/certificates", "-created_at");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", award_title: "", event_name: "", organization: "", issued_on: new Date().toLocaleDateString("sv-SE") });
  const revoke = useAction((id: number) => api(`/admin/certificates/${id}/revoke`, { method: "POST" }), { success: "Certificat révoqué", invalidate: ["/admin/certificates"] });

  const create = async () => {
    try {
      await api("/admin/certificates", { method: "POST", body: form });
      toast.success("Certificat émis");
      setOpen(false);
      client.invalidateQueries({ queryKey: ["/admin/certificates"] });
    } catch (e) {
      toast.error("Émission impossible", e instanceof ApiError ? Object.values(e.errors)[0]?.[0] : undefined);
    }
  };

  return (
    <>
      <PageTitle title="Certificats numériques" description="Certificats d'authenticité signés (empreinte SHA-256), vérifiables publiquement par QR code." actions={can("qr_codes.create") ? <Button size="sm" onClick={() => setOpen(true)}>Nouveau certificat</Button> : undefined} />
      <DataTable<Cert>
        columns={[
          { key: "number", header: "N°", cell: (c) => <span className="font-mono text-accent-strong">{c.number}</span> },
          { key: "recipient", header: "Bénéficiaire", cell: (c) => <span><span className="font-medium">{c.recipient_name}</span><span className="block text-xs text-mute">{c.award_title}</span></span> },
          { key: "event", header: "Événement", cell: (c) => [c.event_name, c.organization].filter(Boolean).join(" · ") || "—", desktopOnly: true },
          { key: "issued_on", header: "Délivré", sort: "issued_on", cell: (c) => date(c.issued_on) },
          { key: "state", header: "État", cell: (c) => (c.is_revoked ? <Badge tone="danger">Révoqué</Badge> : <Badge tone="success">Valide</Badge>) },
          { key: "act", header: "", align: "right", cell: (c) => (
            <span className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => download(`/admin/certificates/${c.id}/pdf`, undefined, `${c.number}.pdf`)}>PDF</Button>
              {!c.is_revoked && can("qr_codes.update") && <Button size="sm" variant="ghost" className="text-danger" onClick={() => revoke.mutate(c.id)}>Révoquer</Button>}
            </span>
          ) },
        ]}
        rows={query.data?.data} meta={query.data?.meta} loading={query.isPending} error={query.error} onRetry={() => query.refetch()}
        state={state} onStateChange={setState} rowKey={(c) => c.id} searchPlaceholder="N°, bénéficiaire, événement…"
      />
      <Drawer open={open} onClose={() => setOpen(false)} title="Nouveau certificat" description="Pour un trophée connecté, utilisez « Certifier » depuis les QR codes." footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={create}>Émettre</Button></>}>
        <div className="grid gap-4">
          <Field label="Bénéficiaire" required>{(p) => <Input {...p} value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />}</Field>
          <Field label="Distinction" required>{(p) => <Input {...p} value={form.award_title} onChange={(e) => setForm({ ...form, award_title: e.target.value })} />}</Field>
          <Field label="Événement">{(p) => <Input {...p} value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} />}</Field>
          <Field label="Organisation">{(p) => <Input {...p} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />}</Field>
          <Field label="Date">{(p) => <DatePicker {...p} value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} />}</Field>
        </div>
      </Drawer>
    </>
  );
}
