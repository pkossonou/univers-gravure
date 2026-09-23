import { Navbar } from "@/components/site/navbar";

/** Expériences plein écran (studio, configurateur) : pas de pied de page ni de barre mobile. */
export default function ImmersiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="contenu" className="min-h-dvh">
        {children}
      </main>
    </>
  );
}
