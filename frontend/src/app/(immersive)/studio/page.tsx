import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = {
  title: "Créer mon projet — Donnez vie à votre idée",
  description: "Trophée, médaille, gravure, impression ou objet personnalisé : le studio UNIVERS GRAVURE vous guide étape par étape avec une estimation immédiate.",
  alternates: { canonical: "/studio" },
};

const TO_CONFIGURATOR: Record<string, string> = { trophee: "trophees", medaille: "medailles", plaque: "plaques" };

export default async function StudioPage({ searchParams }: PageProps<"/studio">) {
  const { type } = await searchParams;
  if (typeof type === "string" && TO_CONFIGURATOR[type]) redirect(`/configurateur?type=${TO_CONFIGURATOR[type]}`);
  return <Studio initial={typeof type === "string" ? type : undefined} />;
}
