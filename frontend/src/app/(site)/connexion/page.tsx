import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/site/auth-forms";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function LoginPage() {
  return (
    <section className="container-x flex min-h-dvh items-center justify-center pt-28 pb-16">
      <div className="w-full max-w-md">
        <p className="eyebrow">Espace client &amp; équipe</p>
        <h1 className="display mt-4 text-5xl text-ink">Bon retour.</h1>
        <p className="mt-3 text-mute">Suivez vos demandes, validez vos devis, retrouvez vos factures.</p>
        <div className="mt-10 rounded-3xl border border-line bg-surface p-6 md:p-8">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
