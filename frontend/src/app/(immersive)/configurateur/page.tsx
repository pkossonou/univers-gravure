import type { Metadata } from "next";
import { Configurator } from "@/components/studio/configurator";

export const metadata: Metadata = {
  title: "Configurez votre trophée en 3D",
  description: "Choisissez la forme, la matière, la finition, gravez votre texte et votre logo : votre trophée évolue en 3D en temps réel, avec une estimation immédiate.",
  alternates: { canonical: "/configurateur" },
};

export default async function ConfiguratorPage({ searchParams }: PageProps<"/configurateur">) {
  const q = await searchParams;
  return (
    <>
      <h1 className="sr-only">Configurez votre trophée</h1>
      <Configurator initialSlug={typeof q.product === "string" ? q.product : undefined} initialType={typeof q.type === "string" ? q.type : undefined} />
    </>
  );
}
