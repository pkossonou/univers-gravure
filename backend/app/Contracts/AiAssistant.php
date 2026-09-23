<?php

namespace App\Contracts;

/**
 * Point d'extension IA (ARCHITECTURE D9).
 * V1 : implémentation nulle, aucun appel externe. Brancher un fournisseur = une nouvelle classe
 * + le binding dans AppServiceProvider, sans toucher aux contrôleurs.
 */
interface AiAssistant
{
    public function isEnabled(): bool;

    /** Suggestion de matériaux pour un type de projet et un usage. @return list<string> slugs */
    public function suggestMaterials(string $projectType, ?string $usage = null): array;

    /** Brouillon de description produit / texte marketing. */
    public function draftDescription(string $productName, array $facts = []): ?string;

    /** Pré-analyse d'un fichier envoyé (qualité, vectoriel ou non…). @return array<string, mixed> */
    public function analyzeFile(string $path, string $mime): array;

    /** Aide à la préparation d'un devis à partir d'une demande. @return array<string, mixed> */
    public function draftQuote(array $project): array;
}
