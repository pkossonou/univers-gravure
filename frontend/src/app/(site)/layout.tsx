import { Footer } from "@/components/site/footer";
import { Intro } from "@/components/site/intro";
import { MobileDock, Navbar } from "@/components/site/navbar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Intro />
      <Navbar />
      <main id="contenu" className="grain min-h-dvh">
        {children}
      </main>
      <Footer />
      <MobileDock />
    </>
  );
}
