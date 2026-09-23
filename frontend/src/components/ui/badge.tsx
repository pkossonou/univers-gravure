import { cn } from "@/lib/format";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-raised text-mute border-line-strong",
  accent: "bg-accent/10 text-accent-strong border-accent/40",
  success: "bg-success/10 text-success border-success/35",
  warning: "bg-warning/10 text-warning border-warning/35",
  danger: "bg-danger/10 text-danger border-danger/35",
  info: "bg-info/10 text-info border-info/35",
};

export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  // Demandes
  new: "info", quote_preparing: "warning", quote_sent: "accent", awaiting_validation: "accent", validated: "success", rejected: "danger", cancelled: "neutral",
  // Devis
  draft: "neutral", sent: "accent", accepted: "success", expired: "neutral", converted: "success",
  // Commandes
  in_design: "info", in_production: "warning", quality_check: "info", ready: "success", delivered: "success", completed: "neutral",
  // Factures / paiements
  issued: "accent", partially_paid: "warning", paid: "success", unpaid: "danger", partial: "warning",
  // Production
  pending: "neutral", in_progress: "warning", paused: "neutral", done: "success", skipped: "neutral",
  // Prospects
  contacted: "info", qualified: "accent", lost: "neutral",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} dot>
      {label ?? status}
    </Badge>
  );
}
