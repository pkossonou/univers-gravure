import "server-only";
import { buildQuery } from "./api";
import { SITE } from "./site";

/**
 * Lecture côté serveur Next (pages publiques indexables).
 * Revalidation courte : le back-office reste la source de vérité.
 */
export async function serverApi<T>(path: string, query?: Record<string, string | number | undefined>, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${SITE.serverApiUrl}${path}${buildQuery(query)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // API indisponible : la page s'affiche avec un état vide plutôt que de planter
    return null;
  }
}
