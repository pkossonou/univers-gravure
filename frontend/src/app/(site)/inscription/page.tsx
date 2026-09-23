import type { Metadata } from "next";
import { RegisterForm } from "@/components/site/auth-forms";

export const metadata: Metadata = { title: "Créer mon espace client", robots: { index: false } };

export default function RegisterPage() {
  return (
    <section className="container-x flex min-h-dvh items-center justify-center pt-28 pb-16">
      <div className="w-full max-w-2xl">
        <p className="eyebrow">Espace client</p>
        <h1 className="display mt-4 text-5xl text-ink">Votre atelier en ligne.</h1>
        <p className="mt-3 text-mute">Demandes, devis, commandes, factures et fichiers, réunis au même endroit.</p>
        <div className="mt-10 rounded-3xl border border-line bg-surface p-6 md:p-8">
          <RegisterForm />
        </div>
      </div>
    </section>
  );
}
