"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/format";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
}

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), t.tone === "error" ? 7000 : 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-4 bottom-24 z-[100] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-line-strong bg-raised/95 shadow-2xl backdrop-blur"
            >
              <div className="flex gap-3 p-4">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", t.tone === "success" ? "bg-success" : t.tone === "error" ? "bg-danger" : "bg-accent")} aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-sm text-mute">{t.body}</p>}
                </div>
              </div>
              <div className={cn("h-0.5", t.tone === "error" ? "bg-danger/60" : "bg-accent/60")} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  return {
    success: (title: string, body?: string) => push({ tone: "success", title, body }),
    error: (title: string, body?: string) => push({ tone: "error", title, body }),
    info: (title: string, body?: string) => push({ tone: "info", title, body }),
  };
}
