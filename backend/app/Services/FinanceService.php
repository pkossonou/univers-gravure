<?php

namespace App\Services;

use App\Models\ExpenseCategory;
use App\Models\Invoice;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Analyse financière calculée exclusivement depuis MySQL.
 *
 * Définitions (ARCHITECTURE D5/D6) :
 *  - Chiffre d'affaires = factures émises (hors brouillons/annulées, par date d'émission) + recettes hors facture
 *  - Encaissements      = paiements reçus + recettes hors facture
 *  - Coûts directs      = dépenses des catégories « coût direct »
 *  - Marge brute        = CA − coûts directs
 *  - Résultat calculé   = CA − toutes les dépenses saisies. N'est PAS présenté comme « bénéfice net » :
 *                         on signale les charges récurrentes absentes de la période.
 */
class FinanceService
{
    public const PERIODS = ['today', 'week', 'month', 'quarter', 'year', 'custom'];

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    public function resolvePeriod(string $period, ?string $from = null, ?string $to = null, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();

        return match ($period) {
            'today' => [$now->startOfDay(), $now->endOfDay()],
            'week' => [$now->startOfWeek(), $now->endOfWeek()],
            'month' => [$now->startOfMonth(), $now->endOfMonth()],
            'quarter' => [$now->firstOfQuarter()->startOfDay(), $now->lastOfQuarter()->endOfDay()],
            'year' => [$now->startOfYear(), $now->endOfYear()],
            'custom' => $this->customPeriod($from, $to),
            default => throw new InvalidArgumentException("Période inconnue : $period"),
        };
    }

    /** @return array<string, mixed> */
    public function summary(CarbonImmutable $from, CarbonImmutable $to, bool $withComparison = true): array
    {
        [$f, $t] = [$from->toDateString(), $to->toDateString()];

        $invoiced = (int) Invoice::query()->countable()->whereBetween('issued_at', [$f, $t])->sum('total');
        $otherRevenue = (int) DB::table('revenues')->whereNull('deleted_at')->whereBetween('revenue_date', [$f, $t])->sum('amount');
        $revenue = $invoiced + $otherRevenue;

        $payments = (int) DB::table('payments')->whereBetween('paid_at', [$f, $t])->sum('amount');

        $expenseRows = DB::table('expenses')
            ->join('expense_categories', 'expense_categories.id', '=', 'expenses.expense_category_id')
            ->whereNull('expenses.deleted_at')
            ->whereBetween('expenses.expense_date', [$f, $t])
            ->selectRaw('SUM(expenses.amount) as total, SUM(CASE WHEN expense_categories.is_direct_cost = 1 THEN expenses.amount ELSE 0 END) as direct')
            ->first();
        $expenses = (int) ($expenseRows->total ?? 0);
        $directCosts = (int) ($expenseRows->direct ?? 0);

        $orders = DB::table('orders')
            ->whereNull('deleted_at')
            ->where('status', '!=', 'cancelled')
            ->whereBetween('ordered_at', [$f, $t])
            ->selectRaw('COUNT(*) as n, COALESCE(SUM(total), 0) as amount')
            ->first();
        $ordersCount = (int) $orders->n;

        $grossMargin = $revenue - $directCosts;
        $result = $revenue - $expenses;

        $data = [
            'period' => ['from' => $f, 'to' => $t],
            'revenue' => [
                'total' => $revenue,
                'invoiced' => $invoiced,
                'other' => $otherRevenue,
            ],
            'cash_in' => $payments + $otherRevenue,
            'expenses' => [
                'total' => $expenses,
                'direct' => $directCosts,
                'overhead' => $expenses - $directCosts,
            ],
            'gross_margin' => [
                'amount' => $grossMargin,
                'rate' => $revenue > 0 ? round($grossMargin / $revenue * 100, 1) : null,
                'label' => 'Marge brute estimée (CA − coûts directs saisis)',
            ],
            'result' => [
                'amount' => $result,
                'rate' => $revenue > 0 ? round($result / $revenue * 100, 1) : null,
                'label' => 'Résultat calculé sur les données saisies',
                'completeness' => $this->completeness($from, $to),
            ],
            'orders' => [
                'count' => $ordersCount,
                'amount' => (int) $orders->amount,
                'average' => $ordersCount > 0 ? (int) round($orders->amount / $ordersCount) : 0,
            ],
            'receivables' => (int) Invoice::query()->countable()->where('issued_at', '<=', $t)
                ->sum(DB::raw('total - amount_paid')),
        ];

        if ($withComparison) {
            $days = (int) $from->startOfDay()->diffInDays($to->startOfDay()) + 1;
            $prevTo = $from->subDay()->endOfDay();
            $prevFrom = $prevTo->subDays($days - 1)->startOfDay();
            $prev = $this->summary($prevFrom, $prevTo, false);
            $data['previous'] = [
                'period' => $prev['period'],
                'revenue' => $prev['revenue']['total'],
                'expenses' => $prev['expenses']['total'],
                'result' => $prev['result']['amount'],
                'orders' => $prev['orders']['count'],
            ];
            $data['variation'] = [
                'revenue' => $this->variation($revenue, $prev['revenue']['total']),
                'expenses' => $this->variation($expenses, $prev['expenses']['total']),
                'result' => $this->variation($result, $prev['result']['amount']),
                'orders' => $this->variation($ordersCount, $prev['orders']['count']),
            ];
        }

        return $data;
    }

    /**
     * Séries temporelles CA / dépenses / résultat, regroupées par jour, semaine ou mois selon la durée.
     *
     * @return array{granularity: string, points: list<array<string, mixed>>}
     */
    public function timeseries(CarbonImmutable $from, CarbonImmutable $to): array
    {
        [$f, $t] = [$from->toDateString(), $to->toDateString()];
        $days = (int) $from->startOfDay()->diffInDays($to->startOfDay()) + 1;
        $granularity = $days <= 31 ? 'day' : ($days <= 120 ? 'week' : 'month');

        $bucket = fn (string $date) => match ($granularity) {
            'day' => $date,
            'week' => CarbonImmutable::parse($date)->startOfWeek()->toDateString(),
            'month' => substr($date, 0, 7),
        };

        $points = [];
        $cursor = match ($granularity) {
            'day' => CarbonPeriod::create($from->startOfDay(), '1 day', $to->startOfDay()),
            'week' => CarbonPeriod::create($from->startOfWeek(), '1 week', $to),
            'month' => CarbonPeriod::create($from->startOfMonth(), '1 month', $to),
        };
        foreach ($cursor as $date) {
            $key = $bucket($date->toDateString());
            $points[$key] = ['bucket' => $key, 'revenue' => 0, 'expenses' => 0, 'result' => 0, 'cash_in' => 0];
        }

        $add = function ($rows, string $field) use (&$points, $bucket) {
            foreach ($rows as $row) {
                $key = $bucket((string) $row->d);
                if (isset($points[$key])) {
                    $points[$key][$field] += (int) $row->amount;
                }
            }
        };

        $add(Invoice::query()->countable()->whereBetween('issued_at', [$f, $t])
            ->groupBy('issued_at')->selectRaw('issued_at as d, SUM(total) as amount')->get(), 'revenue');
        $add(DB::table('revenues')->whereNull('deleted_at')->whereBetween('revenue_date', [$f, $t])
            ->groupBy('revenue_date')->selectRaw('revenue_date as d, SUM(amount) as amount')->get(), 'revenue');
        $add(DB::table('revenues')->whereNull('deleted_at')->whereBetween('revenue_date', [$f, $t])
            ->groupBy('revenue_date')->selectRaw('revenue_date as d, SUM(amount) as amount')->get(), 'cash_in');
        $add(DB::table('expenses')->whereNull('deleted_at')->whereBetween('expense_date', [$f, $t])
            ->groupBy('expense_date')->selectRaw('expense_date as d, SUM(amount) as amount')->get(), 'expenses');
        $add(DB::table('payments')->whereBetween('paid_at', [$f, $t])
            ->groupBy('paid_at')->selectRaw('paid_at as d, SUM(amount) as amount')->get(), 'cash_in');

        foreach ($points as &$p) {
            $p['result'] = $p['revenue'] - $p['expenses'];
        }

        return ['granularity' => $granularity, 'points' => array_values($points)];
    }

    /** @return array<string, list<array<string, mixed>>> */
    public function breakdown(CarbonImmutable $from, CarbonImmutable $to, int $limit = 8): array
    {
        [$f, $t] = [$from->toDateString(), $to->toDateString()];

        $expensesByCategory = DB::table('expenses')
            ->join('expense_categories as c', 'c.id', '=', 'expenses.expense_category_id')
            ->whereNull('expenses.deleted_at')
            ->whereBetween('expense_date', [$f, $t])
            ->groupBy('c.id', 'c.name', 'c.color', 'c.is_direct_cost')
            ->selectRaw('c.id, c.name as label, c.color, c.is_direct_cost, SUM(expenses.amount) as amount')
            ->orderByDesc('amount')
            ->get();

        // Lignes de commandes dont la facture est comptabilisée sur la période
        $invoicedItems = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('invoices as i', 'i.order_id', '=', 'o.id')
            ->whereNull('i.deleted_at')
            ->whereIn('i.status', Invoice::REVENUE_STATUSES)
            ->whereBetween('i.issued_at', [$f, $t]);

        $byCategory = (clone $invoicedItems)
            ->leftJoin('products as p', 'p.id', '=', 'oi.product_id')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->groupBy('c.id', 'c.name')
            ->selectRaw("c.id, COALESCE(c.name, 'Sur mesure') as label, SUM(oi.total) as amount")
            ->orderByDesc('amount')
            ->get();

        $byProduct = (clone $invoicedItems)
            ->leftJoin('products as p', 'p.id', '=', 'oi.product_id')
            ->groupBy('p.id', 'p.name')
            ->selectRaw("p.id, COALESCE(p.name, 'Sur mesure') as label, SUM(oi.total) as amount, SUM(oi.quantity) as quantity")
            ->orderByDesc('amount')
            ->limit($limit)
            ->get();

        $invoiceByClient = DB::table('invoices as i')
            ->join('clients as cl', 'cl.id', '=', 'i.client_id')
            ->whereNull('i.deleted_at')
            ->whereIn('i.status', Invoice::REVENUE_STATUSES)
            ->whereBetween('i.issued_at', [$f, $t])
            ->groupBy('cl.id', 'cl.company', 'cl.first_name', 'cl.last_name')
            ->selectRaw("cl.id, COALESCE(NULLIF(cl.company, ''), CONCAT_WS(' ', cl.first_name, cl.last_name)) as label, SUM(i.total) as amount")
            ->orderByDesc('amount')
            ->limit($limit)
            ->get();

        $cast = fn ($rows) => $rows->map(fn ($r) => array_merge((array) $r, ['amount' => (int) $r->amount]))->values()->all();

        return [
            'expenses_by_category' => $cast($expensesByCategory),
            'revenue_by_category' => $cast($byCategory),
            'revenue_by_product' => $cast($byProduct),
            'revenue_by_client' => $cast($invoiceByClient),
        ];
    }

    /**
     * Charges récurrentes sans aucune saisie sur un mois de la période : le résultat est alors incomplet.
     *
     * @return array{is_complete: bool, missing: list<array{category: string, month: string}>}
     */
    public function completeness(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $recurring = ExpenseCategory::query()->where('is_recurring', true)->where('is_active', true)->get(['id', 'name']);
        $missing = [];

        // On ne vérifie que les mois entièrement écoulés ou le mois courant jusqu'à aujourd'hui
        $end = $to->min(CarbonImmutable::now());
        if ($recurring->isEmpty() || $end->lt($from)) {
            return ['is_complete' => true, 'missing' => []];
        }

        $recorded = DB::table('expenses')
            ->whereNull('deleted_at')
            ->whereIn('expense_category_id', $recurring->pluck('id'))
            ->whereBetween('expense_date', [$from->startOfMonth()->toDateString(), $end->endOfMonth()->toDateString()])
            ->get(['expense_category_id', 'expense_date'])
            ->map(fn ($r) => $r->expense_category_id.'|'.substr((string) $r->expense_date, 0, 7))
            ->unique()
            ->flip();

        foreach (CarbonPeriod::create($from->startOfMonth(), '1 month', $end) as $month) {
            $key = $month->format('Y-m');
            foreach ($recurring as $cat) {
                if (! isset($recorded[$cat->id.'|'.$key])) {
                    $missing[] = ['category' => $cat->name, 'month' => $key];
                }
            }
        }

        return ['is_complete' => $missing === [], 'missing' => $missing];
    }

    private function variation(int|float $current, int|float $previous): ?float
    {
        if ($previous == 0) {
            return $current == 0 ? 0.0 : null;
        }

        return round(($current - $previous) / abs($previous) * 100, 1);
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function customPeriod(?string $from, ?string $to): array
    {
        if (! $from || ! $to) {
            throw new InvalidArgumentException('Les dates de début et de fin sont requises pour une période personnalisée.');
        }
        $start = CarbonImmutable::parse($from)->startOfDay();
        $end = CarbonImmutable::parse($to)->endOfDay();
        if ($end->lt($start)) {
            throw new InvalidArgumentException('La date de fin doit être postérieure à la date de début.');
        }

        return [$start, $end];
    }
}
