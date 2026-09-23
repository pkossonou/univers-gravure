"use client";

import { EmptyState, ErrorState, Skeleton } from "@/components/ui/primitives";
import { bytes, date } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Paginated } from "@/lib/types";

interface FileRow {
  id: number;
  name: string;
  kind: string;
  size: number;
  extension: string;
  is_image: boolean;
  project?: { id: number; number: string };
  url: string;
  preview_url?: string | null;
  created_at: string;
}

export default function MyFiles() {
  const { data, isPending, error, refetch } = useApi<Paginated<FileRow>>("/me/files");
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (isPending) return <Skeleton className="h-60 rounded-3xl" />;
  if (!data?.data.length) return <EmptyState title="Aucun fichier" body="Les logos, maquettes et photos envoyés avec vos demandes apparaîtront ici." />;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {data.data.map((f) => (
        <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-accent/40">
          <div className="flex aspect-square items-center justify-center bg-raised">
            {f.is_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.preview_url ?? f.url} alt={f.name} loading="lazy" className="size-full object-cover" />
            ) : (
              <span className="font-mono text-lg text-mute">{f.extension.toUpperCase()}</span>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm text-ink">{f.name}</p>
            <p className="font-mono text-xs text-faint">{bytes(f.size)} · {date(f.created_at)}</p>
            {f.project && <span className="font-mono text-xs text-accent-strong">{f.project.number}</span>}
          </div>
        </a>
      ))}
    </div>
  );
}
