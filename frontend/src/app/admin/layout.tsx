import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { AuthGuard } from "@/components/auth-guard";

export const metadata: Metadata = { title: { default: "Back-office", template: "%s — Back-office" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard staff>
      <AdminShell>
        <Suspense>{children}</Suspense>
      </AdminShell>
    </AuthGuard>
  );
}
