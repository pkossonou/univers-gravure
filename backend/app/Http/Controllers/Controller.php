<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

abstract class Controller
{
    /**
     * Format de liste unique pour tout le front : { data: [...], meta: {...} }.
     *
     * @param  class-string<JsonResource>|null  $resource
     */
    protected function paginated(LengthAwarePaginator $paginator, ?string $resource = null, array $extraMeta = []): JsonResponse
    {
        $items = $resource ? $resource::collection($paginator->getCollection())->resolve() : $paginator->items();

        return response()->json([
            'data' => $items,
            'meta' => array_merge([
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ], $extraMeta),
        ]);
    }

    /** Refuse (403) si l'utilisateur n'a pas la permission `module.action`. */
    protected function allow(string $permission): void
    {
        abort_unless(auth()->user()?->can($permission), 403, 'Action non autorisée pour votre rôle.');
    }

    protected function message(string $message, int $status = 200, array $extra = []): JsonResponse
    {
        return response()->json(['message' => $message] + $extra, $status);
    }
}
