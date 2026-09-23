<?php

namespace App\Http\Controllers\Admin;

use App\Models\PortfolioItem;
use App\Services\MediaService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Réalisations (galerie du site). Les images et vidéos s'envoient directement depuis le back-office
 * (champs fichier `image`, `before_image`, `video`) ; une URL reste possible pour un média hébergé ailleurs.
 */
class PortfolioController extends CrudController
{
    protected string $model = PortfolioItem::class;

    protected string $permission = 'products';

    protected array $sortable = ['title', 'year', 'sort_order', 'created_at'];

    protected array $filterable = ['category', 'is_published'];

    protected array $searchable = ['title', 'client_label'];

    protected string $defaultSort = 'sort_order';

    private const MEDIA = ['image' => 'image_url', 'before_image' => 'before_image_url', 'video' => 'video_url'];

    public function __construct(private MediaService $media) {}

    protected function rules(Request $request, ?Model $record): array
    {
        $url = ['nullable', 'string', 'max:255', 'regex:#^(https?://|/)#'];
        $hasVisual = $request->hasFile('image') || $request->hasFile('video') || $request->filled('image_url') || $request->filled('video_url') || ($record?->image_url || $record?->video_url);

        return [
            'title' => ['required', 'string', 'max:190'],
            'category' => ['required', Rule::in(PortfolioItem::CATEGORIES)],
            'client_label' => ['nullable', 'string', 'max:190'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image' => MediaService::IMAGE_RULES,
            'before_image' => MediaService::IMAGE_RULES,
            'video' => MediaService::VIDEO_RULES,
            'image_url' => $hasVisual ? $url : ['required'],
            'before_image_url' => $url,
            'video_url' => $url,
            'ratio' => ['required', Rule::in(['portrait', 'landscape', 'square'])],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'is_published' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function messages(): array
    {
        return ['image_url.required' => 'Ajoutez une image ou une vidéo.'];
    }

    protected function prepare(array $data, ?Model $record): array
    {
        foreach (self::MEDIA as $file => $column) {
            unset($data[$file]);
            if (request()->hasFile($file)) {
                $this->media->delete($record?->{$column});
                $data[$column] = $this->media->store(request()->file($file), 'portfolio');
            }
        }
        if (! $record) {
            $data['slug'] = Str::slug($data['title']).'-'.Str::lower(Str::random(4));
        }

        return $data;
    }

    public function destroy(int $id): JsonResponse
    {
        $item = PortfolioItem::findOrFail($id);
        $response = parent::destroy($id);
        foreach (self::MEDIA as $column) {
            $this->media->delete($item->{$column});
        }

        return $response;
    }
}
