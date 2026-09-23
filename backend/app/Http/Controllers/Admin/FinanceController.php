<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\FinanceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class FinanceController extends Controller
{
    public function __construct(private FinanceService $finance) {}

    /** Analyse complète d'une période : synthèse, courbes, répartitions. */
    public function __invoke(Request $request): JsonResponse
    {
        $this->allow('finance.view');
        [$from, $to] = $this->period($request);

        return response()->json(['data' => [
            'summary' => $this->finance->summary($from, $to),
            'timeseries' => $this->finance->timeseries($from, $to),
            'breakdown' => $this->finance->breakdown($from, $to),
            'definitions' => [
                'revenue' => "Chiffre d'affaires : factures émises (hors brouillons et annulations) + recettes hors facture.",
                'cash_in' => 'Encaissements : paiements reçus + recettes hors facture.',
                'gross_margin' => 'Marge brute estimée : CA − dépenses des catégories « coût direct ».',
                'result' => 'Résultat calculé : CA − toutes les dépenses enregistrées. Ce n\'est pas un bénéfice net comptable.',
            ],
        ]]);
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function period(Request $request): array
    {
        $request->validate([
            'period' => ['nullable', Rule::in(FinanceService::PERIODS)],
            'from' => ['required_if:period,custom', 'nullable', 'date'],
            'to' => ['required_if:period,custom', 'nullable', 'date', 'after_or_equal:from'],
        ]);

        try {
            return $this->finance->resolvePeriod($request->query('period', 'month'), $request->query('from'), $request->query('to'));
        } catch (InvalidArgumentException $e) {
            abort(422, $e->getMessage());
        }
    }
}
