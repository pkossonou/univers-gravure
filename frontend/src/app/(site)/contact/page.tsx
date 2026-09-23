import type { Metadata } from "next";
import { ContactPanel } from "@/components/site/contact-panel";
import { PageHeader } from "@/components/site/page-header";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact — atelier de gravure à Abidjan",
  description: "Contactez UNIVERS GRAVURE à Abidjan pour vos trophées, médailles, gravures, impressions et cadeaux d'entreprise.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const content = await getContent();
  return (
    <>
      <PageHeader eyebrow="Contact" title="Parlons de votre projet." body={content["contact.intro"]} />
      <section className="container-x pb-24">
        <ContactPanel />
      </section>
    </>
  );
}
