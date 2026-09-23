<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Convention de liste pour toute l'API :
 *   ?search=…            recherche (scope search() du modèle ou colonnes $searchable)
 *   ?filter[col]=a,b     filtre exact (colonnes autorisées uniquement)
 *   ?sort=-created_at    tri (colonnes autorisées uniquement, « - » = décroissant)
 *   ?per_page=25         pagination (max 100)
 */
trait ListsRecords
{
    /**
     * @param  list<string>  $sortable
     * @param  list<string>  $filterable
     * @param  list<string>  $searchable  utilisé si le modèle n'a pas de scope search()
     */
    protected function listQuery(Builder $query, Request $request, array $sortable = ['created_at'], array $filterable = [], array $searchable = [], string $defaultSort = '-created_at'): LengthAwarePaginator
    {
        if ($term = trim((string) $request->query('search'))) {
            if (method_exists($query->getModel(), 'scopeSearch')) {
                $query->search($term);
            } elseif ($searchable) {
                $query->where(function ($q) use ($searchable, $term) {
                    foreach ($searchable as $col) {
                        $q->orWhere($col, 'like', '%'.$term.'%');
                    }
                });
            }
        }

        foreach ((array) $request->query('filter', []) as $column => $value) {
            if (! in_array($column, $filterable, true) || $value === '' || $value === null) {
                continue;
            }
            $values = is_array($value) ? $value : explode(',', (string) $value);
            $values = array_map(fn ($v) => $v === 'true' ? 1 : ($v === 'false' ? 0 : $v), $values);
            count($values) > 1 ? $query->whereIn($column, $values) : $query->where($column, $values[0]);
        }

        if ($from = $request->query('date_from')) {
            $query->whereDate($this->dateColumn ?? 'created_at', '>=', $from);
        }
        if ($to = $request->query('date_to')) {
            $query->whereDate($this->dateColumn ?? 'created_at', '<=', $to);
        }

        $sort = (string) $request->query('sort', $defaultSort);
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');
        if (in_array($column, $sortable, true)) {
            $query->orderBy($column, $direction);
        }
        $query->orderByDesc($query->getModel()->getQualifiedKeyName());

        $perPage = min(100, max(1, (int) $request->query('per_page', 20)));

        return $query->paginate($perPage)->withQueryString();
    }
}
