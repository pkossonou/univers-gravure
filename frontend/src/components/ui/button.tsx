import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-[background,color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-signature)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

const variants: Record<Variant, string> = {
  // Le laiton est rare : réservé à l'action principale
  primary:
    "bg-accent text-accent-ink hover:bg-accent-strong shadow-[0_0_0_1px_rgb(255_255_255/0.08)_inset,0_10px_30px_-12px_var(--accent)]",
  secondary: "bg-raised text-ink border border-line-strong hover:border-accent hover:text-accent-strong",
  outline: "border border-line-strong text-ink hover:border-accent hover:text-accent-strong",
  ghost: "text-mute hover:text-ink hover:bg-raised",
  danger: "bg-danger text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-full",
  md: "h-11 px-5 text-[0.95rem] rounded-full",
  lg: "h-14 px-7 text-base rounded-full",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: { href: string; variant?: Variant; size?: Size } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...props }: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("inline-flex size-10 items-center justify-center rounded-full text-mute transition hover:bg-raised hover:text-ink", className)}
      {...props}
    >
      {children}
    </button>
  );
}
