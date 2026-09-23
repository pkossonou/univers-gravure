"use client";

import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ResourceManager } from "@/components/admin/resource-manager";
import { PageTitle } from "@/components/admin/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, download } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Qr extends Record<string, unknown> {
  id: number;
  code: string;
  title: string;
  type: string;
  recipient_name?: string;
  event_name?: string;
  year?: number;
  scans_count: number;
  is_public: boolean;
  is_active: boolean;
  public_url: string;
  order?: { number: string } | null;
  certificate?: { number: string } | null;
}

const TYPES = [{ value: "trophy", label: "Trophée" }, { value: "medal", label: "Médaille" }, { value: "plaque", label: "Plaque" }, { value: "product", label: "Produit" }];

export default function QrCodesPage() {
  const params = useSearchParams();
  const { can } = useAuth();
  const toast = useToast();
  const [preview, setPreview] = useState<Qr | null>(null);

  const certify = async (q: Qr) => {
    try {
      const res = await api<{ data: { number: string } }>("/admin/certificates", { method: "POST", body: { qr_code_id: q.id } });
      toast.success(`Certificat ${res.data.number} émis`);
    } catch {
      toast.error("Certificat déjà émis pour ce trophée");
    }
  };

  return (
    <>
      <PageTitle title="QR Codes — trophées connectés" description="Chaque objet reçoit un code unique menant à sa page publique (lauréat, événement, message, certificat)." />
      <ResourceManager<Qr>
        endpoint="/admin/qr-codes" permission="qr_codes" title="QR codes" singular="QR code"
        defaults={{ type: "trophy", is_public: true, is_active: true, year: new Date().getFullYear(), order_id: params.get("order") ? Number(params.get("order")) : undefined }}
        rowActions={(q) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => setPreview(q)}>QR</Button>
            {!q.certificate && can("qr_codes.create") && <Button size="sm" variant="ghost" onClick={() => certify(q)}>Certifier</Button>}
          </>
        )}
        columns={[
          { key: "code", header: "Code", cell: (q) => <span className="font-mono text-accent-strong">{q.code}</span> },
          { key: "recipient", header: "Lauréat / titre", sort: "title", cell: (q) => <span><span className="font-medium">{q.recipient_name ?? q.title}</span><span className="block text-xs text-mute">{[q.title, q.event_name, q.year].filter(Boolean).join(" · ")}</span></span> },
          { key: "order", header: "Commande", cell: (q) => <span className="font-mono text-xs text-mute">{q.order?.number ?? "—"}</span>, desktopOnly: true },
          { key: "scans_count", header: "Scans", sort: "scans_count", align: "right", cell: (q) => q.scans_count },
          { key: "flags", header: "", cell: (q) => <span className="flex gap-1">{q.is_public ? <Badge tone="success">Public</Badge> : <Badge>Privé</Badge>}{q.certificate && <Badge tone="accent">Certifié</Badge>}</span> },
        ]}
        fields={[
          { name: "type", label: "Type", type: "select", options: TYPES, required: true, span: 1 },
          { name: "order_id", label: "Commande (ID)", type: "number", span: 1 },
          { name: "title", label: "Titre de la récompense", required: true, hint: "Ex. : Meilleur buteur" },
          { name: "recipient_name", label: "Lauréat", span: 1 }, { name: "year", label: "Année", type: "number", span: 1 },
          { name: "event_name", label: "Événement", span: 1 }, { name: "category_label", label: "Catégorie", span: 1 },
          { name: "organization", label: "Organisme" },
          { name: "message", label: "Message", type: "textarea" },
          { name: "photo", label: "Photo du lauréat (facultatif)", type: "file", accept: "image/jpeg,image/png,image/webp", previewFrom: "photo_url" },
          { name: "is_public", label: "Page publique active", type: "checkbox", span: 1 }, { name: "is_active", label: "Code actif", type: "checkbox", span: 1 },
        ]}
      />
      <Modal open={!!preview} onClose={() => setPreview(null)} title={`QR ${preview?.code ?? ""}`} description={preview?.public_url}
        footer={<><Button variant="ghost" onClick={() => window.open(preview!.public_url, "_blank")}>Ouvrir la page</Button><Button onClick={() => download(`/admin/qr-codes/${preview!.id}/svg`, undefined, `${preview!.code}.svg`)}>SVG pour la gravure</Button></>}>
        {preview && <div className="flex justify-center rounded-2xl bg-white p-6"><QRCodeSVG value={preview.public_url} size={220} level="M" /></div>}
      </Modal>
    </>
  );
}
