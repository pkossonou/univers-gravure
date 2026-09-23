"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

/**
 * Garde d'accès côté interface. La sécurité réelle est appliquée par l'API (Sanctum + permissions) :
 * ce composant évite seulement d'afficher un écran vide à un visiteur non connecté.
 */
export function AuthGuard({ children, staff }: { children: React.ReactNode; staff?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/connexion?redirect=${encodeURIComponent(pathname)}`);
    else if (staff && !user.is_staff) router.replace("/compte");
  }, [user, loading, staff, router, pathname]);

  if (loading || !user || (staff && !user.is_staff)) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Chargement">
        <div className="h-px w-40 overflow-hidden bg-line">
          <div className="animate-beam h-full w-1/2 bg-accent" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
