<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CRUD générique pour les entités de référence simples (matériaux, fournisseurs, prospects…).
 * Les entités à logique métier (devis, commandes, finances) ont leur propre contrôleur + service.
 */
abstract class CrudController extends Controller
{
    use ListsRecords;

    /** @var class-string<Model> */
    protected string $model;

    /** Module de permission : « materials » → products.view etc. */
    protected string $permission;

    /** @var list<string> */
    protected array $with = [];

    /** @var list<string> */
    protected array $withCount = [];

    /** @var list<string> */
    protected array $sortable = ['created_at'];

    /** @var list<string> */
    protected array $filterable = [];

    /** @var list<string> */
    protected array $searchable = ['name'];

    protected string $defaultSort = '-created_at';

    /** @return array<string, mixed> */
    abstract protected function rules(Request $request, ?Model $record): array;

    /** @return array<string, string> messages de validation personnalisés */
    protected function messages(): array
    {
        return [];
    }

    /** Transforme les données validées avant sauvegarde. */
    protected function prepare(array $data, ?Model $record): array
    {
        return $data;
    }

    /** Traitements après sauvegarde (relations imbriquées…). */
    protected function afterSave(Model $record, array $data, Request $request): void {}

    public function index(Request $request): JsonResponse
    {
        $this->allow($this->permission.'.view');
        $query = $this->model::query()->with($this->with)->withCount($this->withCount);

        return $this->paginated($this->listQuery($query, $request, $this->sortable, $this->filterable, $this->searchable, $this->defaultSort));
    }

    public function show(int $id): JsonResponse
    {
        $this->allow($this->permission.'.view');

        return response()->json(['data' => $this->find($id)->load($this->with)->loadCount($this->withCount)]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->allow($this->permission.'.create');
        $data = $request->validate($this->rules($request, null), $this->messages());

        $record = DB::transaction(function () use ($data, $request) {
            $record = $this->model::create($this->prepare($data, null));
            $this->afterSave($record, $data, $request);

            return $record;
        });
        ActivityLogger::log(class_basename($this->model).'.created', $record);

        return response()->json(['data' => $record->fresh($this->with)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->allow($this->permission.'.update');
        $record = $this->find($id);
        $data = $request->validate($this->rules($request, $record), $this->messages());

        DB::transaction(function () use ($record, $data, $request) {
            $record->update($this->prepare($data, $record));
            $this->afterSave($record, $data, $request);
        });
        ActivityLogger::log(class_basename($this->model).'.updated', $record, null, ['changes' => array_keys($record->getChanges())]);

        return response()->json(['data' => $record->fresh($this->with)]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->allow($this->permission.'.delete');
        $record = $this->find($id);
        $record->delete();
        ActivityLogger::log(class_basename($this->model).'.deleted', $record);

        return $this->message(in_array(SoftDeletes::class, class_uses_recursive($record), true) ? 'Élément archivé.' : 'Élément supprimé.');
    }

    protected function find(int $id): Model
    {
        return $this->model::query()->findOrFail($id);
    }
}
