"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";
import { cn } from "@/lib/format";
import { Button } from "./button";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-mute">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden />;
}

/** État vide : un trait de gravure + une action pour avancer. */
export function EmptyState({ title, body, action, className }: { title: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 px-6 py-14 text-center", className)}>
      <svg viewBox="0 0 120 60" className="h-14 w-28 text-line-strong" aria-hidden>
        <path d="M5 50 H115" stroke="currentColor" strokeDasharray="2 5" />
        <path d="M30 50 C30 20 50 10 60 10 C70 10 90 20 90 50" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <circle cx="60" cy="10" r="3" fill="var(--accent)" />
      </svg>
      <div>
        <p className="font-medium text-ink">{title}</p>
        {body && <p className="mx-auto mt-1 max-w-sm text-sm text-mute">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-danger/10 text-danger" aria-hidden>!</span>
      <p className="text-sm text-mute">{message ?? "Impossible de charger ces données."}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  const id = useId();
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 [scrollbar-width:none]", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn("relative shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors", active ? "text-accent-ink" : "text-mute hover:text-ink")}
          >
            {active && <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">
              {t.label}
              {t.count !== undefined && <span className={cn("ml-1.5 font-mono text-xs", active ? "opacity-70" : "text-faint")}>{t.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Accordion({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 py-5 text-left text-lg text-ink transition hover:text-accent-strong"
            >
              {item.q}
              <span className={cn("relative size-4 shrink-0 transition-transform duration-300", isOpen && "rotate-45")} aria-hidden>
                <span className="absolute top-1/2 left-0 h-px w-4 bg-current" />
                <span className="absolute top-0 left-1/2 h-4 w-px bg-current" />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pb-6 text-mute">{item.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: number | null;
  tone?: "default" | "warning" | "danger";
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-5", tone === "warning" && "border-warning/40", tone === "danger" && "border-danger/40", className)}>
      <p className="font-mono text-[0.68rem] tracking-[0.18em] text-faint uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-mute">
        {delta !== undefined && delta !== null && (
          <span className={cn("font-mono", delta >= 0 ? "text-success" : "text-danger")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString("fr-FR")} %
          </span>
        )}
        {hint}
      </div>
    </div>
  );
}

/** Frise de suivi : DEMANDE → … → TERMINÉ. Verticale sur mobile, horizontale sur desktop. */
export function Timeline({ stages }: { stages: { key: string; label: string; state: "done" | "current" | "upcoming"; date?: string | null }[] }) {
  return (
    <ol className="grid gap-0 md:grid-flow-col md:auto-cols-fr">
      {stages.map((s, i) => (
        <li key={s.key} className="relative flex gap-4 pb-6 md:flex-col md:gap-3 md:pb-0" aria-current={s.state === "current" ? "step" : undefined}>
          {i < stages.length - 1 && (
            <span
              className={cn("absolute top-5 left-[15px] h-full w-px md:top-[15px] md:left-8 md:h-px md:w-[calc(100%-2rem)]", s.state === "done" ? "bg-accent" : "bg-line-strong")}
              aria-hidden
            />
          )}
          <span
            className={cn(
              "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
              s.state === "done" && "border-accent bg-accent text-accent-ink",
              s.state === "current" && "border-accent bg-canvas text-accent-strong shadow-[0_0_0_6px_color-mix(in_oklab,var(--accent)_18%,transparent)]",
              s.state === "upcoming" && "border-line-strong bg-canvas text-faint",
            )}
          >
            {s.state === "done" ? "✓" : String(i + 1).padStart(2, "0")}
          </span>
          <div className="md:pr-4">
            <p className={cn("text-sm font-medium", s.state === "upcoming" ? "text-faint" : "text-ink")}>{s.label}</p>
            {s.date && <p className="font-mono text-xs text-faint">{new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>}
            {s.state === "current" && <p className="text-xs text-accent-strong">En cours</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Stepper({ steps, current, onStepClick }: { steps: string[]; current: number; onStepClick?: (i: number) => void }) {
  return (
    <nav aria-label="Progression" className="w-full">
      <p className="mb-3 font-mono text-xs tracking-[0.2em] text-faint uppercase">
        Étape {String(current + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")} — <span className="text-accent-strong">{steps[current]}</span>
      </p>
      <ol className="flex gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <button
              type="button"
              disabled={!onStepClick || i > current}
              onClick={() => onStepClick?.(i)}
              aria-label={`Étape ${i + 1} : ${s}`}
              aria-current={i === current ? "step" : undefined}
              className="group block h-6 w-full disabled:cursor-default"
            >
              <span className={cn("block h-1 w-full rounded-full transition-colors duration-500", i < current ? "bg-accent" : i === current ? "bg-accent-strong" : "bg-line-strong")} />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Reveal({ children, delay = 0, className, y = 28 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Le « faisceau » : ligne laiton qui balaie, signature visuelle de la marque. */
export function BeamLine({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-px w-full overflow-hidden bg-line", className)} aria-hidden>
      <div className="animate-beam absolute inset-y-0 w-1/3 bg-[linear-gradient(90deg,transparent,var(--brass-300),transparent)]" />
    </div>
  );
}

export function SectionHeading({ eyebrow, title, body, align = "left", className }: { eyebrow: string; title: React.ReactNode; body?: React.ReactNode; align?: "left" | "center"; className?: string }) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display mt-4 text-4xl text-ink md:text-6xl">{title}</h2>
        {body && <p className="mt-5 text-lg leading-relaxed text-mute">{body}</p>}
      </Reveal>
    </div>
  );
}
