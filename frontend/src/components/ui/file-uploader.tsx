"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, uploadWithProgress } from "@/lib/api";
import { bytes, cn } from "@/lib/format";

export interface UploadedFile {
  key: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  token?: string;
}

const ACCEPT: Record<string, string> = {
  png: "PNG", jpg: "JPG", jpeg: "JPG", webp: "WEBP", svg: "SVG", pdf: "PDF", ai: "AI", eps: "EPS",
};
const MAX_MB = 20;

/**
 * Zone « Envoyez votre projet » : glisser-déposer ou parcourir, envoi immédiat avec progression.
 * Chaque fichier reçoit un jeton serveur, rattaché ensuite à la demande de devis.
 */
export function FileUploader({
  onChange,
  kind = "autre",
  max = 10,
  compact,
  capture,
  label = "Déposez vos fichiers ici",
}: {
  onChange: (files: UploadedFile[]) => void;
  kind?: string;
  max?: number;
  compact?: boolean;
  capture?: boolean;
  label?: string;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => onChange(files), [files, onChange]);
  useEffect(() => () => files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key: string, patch: Partial<UploadedFile>) => setFiles((all) => all.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  const add = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list).slice(0, Math.max(0, max - files.length));
      for (const file of incoming) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const key = `${file.name}-${file.size}-${Math.random()}`;
        const entry: UploadedFile = {
          key,
          name: file.name,
          size: file.size,
          type: ACCEPT[ext] ?? ext.toUpperCase(),
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
          progress: 0,
          status: "uploading",
        };

        // Contrôle immédiat côté navigateur (le serveur revérifie tout)
        if (!ACCEPT[ext]) {
          setFiles((all) => [...all, { ...entry, status: "error", error: "Format non accepté" }]);
          continue;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          setFiles((all) => [...all, { ...entry, status: "error", error: `Plus de ${MAX_MB} Mo` }]);
          continue;
        }

        setFiles((all) => [...all, entry]);
        const form = new FormData();
        form.append("file", file);
        form.append("kind", kind);
        uploadWithProgress<{ data: { token: string } }>("/uploads", form, (p) => update(key, { progress: p }))
          .then((res) => update(key, { status: "done", progress: 100, token: res.data.token }))
          .catch((e: ApiError) => update(key, { status: "error", error: e.message }));
      }
    },
    [files.length, kind, max],
  );

  const remove = (f: UploadedFile) => {
    if (f.token) api(`/uploads/${f.token}`, { method: "DELETE" }).catch(() => {});
    if (f.preview) URL.revokeObjectURL(f.preview);
    setFiles((all) => all.filter((x) => x.key !== f.key));
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label}. Formats : PNG, JPG, SVG, PDF, AI, EPS. ${MAX_MB} Mo maximum.`}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => (e.preventDefault(), setDragging(true))}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed text-center transition-all duration-300",
          compact ? "gap-2 px-4 py-6" : "gap-4 px-6 py-12",
          dragging ? "border-accent bg-accent/5" : "border-line-strong hover:border-mute hover:bg-raised/40",
        )}
      >
        {/* Croix de registration aux angles */}
        {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos) => (
          <span key={pos} className={cn("absolute size-3 text-accent/50", pos)} aria-hidden>
            <span className="absolute top-1/2 left-0 h-px w-3 bg-current" />
            <span className="absolute top-0 left-1/2 h-3 w-px bg-current" />
          </span>
        ))}
        <span className={cn("flex items-center justify-center rounded-full border border-line-strong text-accent transition-transform duration-500 group-hover:-translate-y-1", compact ? "size-10" : "size-14")} aria-hidden>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
        </span>
        <div>
          <p className="font-medium text-ink">{dragging ? "Relâchez pour envoyer" : label}</p>
          <p className="mt-1 text-sm text-mute">
            ou <span className="text-accent-strong underline underline-offset-4">parcourez</span> — PNG, JPG, SVG, PDF, AI, EPS · {MAX_MB} Mo max
          </p>
        </div>
        <input
          ref={input}
          type="file"
          multiple={max > 1}
          className="sr-only"
          tabIndex={-1}
          accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.ai,.eps"
          {...(capture ? { capture: "environment" as const } : {})}
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <ul className="flex flex-col gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {files.map((f) => (
            <motion.li
              key={f.key}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
            >
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-raised font-mono text-[0.65rem] text-mute">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f.preview ? <img src={f.preview} alt="" className="size-full object-cover" /> : f.type}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{f.name}</p>
                <p className="font-mono text-xs text-faint">
                  {f.type} · {bytes(f.size)} ·{" "}
                  <span className={f.status === "error" ? "text-danger" : f.status === "done" ? "text-success" : "text-accent-strong"}>
                    {f.status === "error" ? f.error : f.status === "done" ? "Envoyé" : `${f.progress} %`}
                  </span>
                </p>
                {f.status === "uploading" && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={f.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Envoi de ${f.name}`}>
                    <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${f.progress}%` }} />
                  </div>
                )}
              </div>
              <button type="button" onClick={() => remove(f)} aria-label={`Retirer ${f.name}`} className="rounded-full p-2 text-faint transition hover:bg-raised hover:text-danger">
                <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
