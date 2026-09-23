<?php

namespace App\Services\Ai;

use App\Contracts\AiAssistant;

/** Implémentation par défaut : ne fait rien, ne coûte rien. */
class NullAiAssistant implements AiAssistant
{
    public function isEnabled(): bool
    {
        return false;
    }

    public function suggestMaterials(string $projectType, ?string $usage = null): array
    {
        return [];
    }

    public function draftDescription(string $productName, array $facts = []): ?string
    {
        return null;
    }

    public function analyzeFile(string $path, string $mime): array
    {
        return ['vector' => in_array($mime, ['image/svg+xml', 'application/pdf', 'application/postscript'], true)];
    }

    public function draftQuote(array $project): array
    {
        return [];
    }
}
