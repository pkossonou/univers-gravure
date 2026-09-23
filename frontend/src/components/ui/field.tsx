import { forwardRef, useId } from "react";
import { cn } from "@/lib/format";

const control =
  "w-full rounded-xl border border-line-strong bg-surface px-4 text-ink placeholder:text-faint transition-colors duration-200 hover:border-mute focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60 aria-[invalid=true]:border-danger";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode;
}

/** Enveloppe accessible : label associé, aide et erreur annoncées aux lecteurs d'écran. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-accent" aria-hidden>*</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, "h-12", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <svg className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-mute" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
});

/** Sélecteur de date natif stylé (clavier et mobile natifs, accessible). */
export const DatePicker = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function DatePicker({ className, ...props }, ref) {
  return <input ref={ref} type="date" className={cn(control, "h-12 [color-scheme:dark] [[data-theme=atelier-light]_&]:[color-scheme:light]", className)} {...props} />;
});

export function Checkbox({ label, className, ...props }: { label: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm text-mute", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" {...props} />
      <span>{label}</span>
    </label>
  );
}

/** Groupe d'options en « pastilles » (choix unique ou multiple). */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  multiple,
  ariaLabel,
}: {
  options: { value: T; label: string; hint?: string; swatch?: string }[];
  value: T | T[] | null;
  onChange: (v: T | T[]) => void;
  multiple?: boolean;
  ariaLabel: string;
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  const toggle = (v: T) => {
    if (!multiple) return onChange(v);
    const arr = Array.isArray(value) ? value : [];
    onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };
  return (
    <div role={multiple ? "group" : "radiogroup"} aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role={multiple ? "checkbox" : "radio"}
          aria-checked={selected(o.value)}
          onClick={() => toggle(o.value)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-200",
            selected(o.value) ? "border-accent bg-accent/10 text-ink" : "border-line-strong text-mute hover:border-mute hover:text-ink",
          )}
        >
          {o.swatch && <span className="size-3.5 rounded-full border border-white/20" style={{ background: o.swatch }} aria-hidden />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
