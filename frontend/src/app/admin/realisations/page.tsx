"use client";

import { PortfolioManager } from "@/components/admin/portfolio-manager";
import { PageTitle } from "@/components/admin/shell";

export default function RealisationsAdmin() {
  return (
    <>
      <PageTitle
        title="Réalisations"
        description="Photos et vidéos de vos travaux, affichées dans la galerie du site et sur l’accueil. « Nouveau » pour ajouter, clic sur une ligne pour modifier, « Supprimer » pour retirer (le fichier est effacé)."
      />
      <PortfolioManager />
    </>
  );
}
