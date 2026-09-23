<?php

namespace App\Http\Resources;

use App\Models\Project;
use App\Support\Labels;
use App\Support\Timeline;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Project */
class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $internal = $request->is('api/v1/admin/*');

        return [
            'id' => $this->id,
            'number' => $this->number,
            'channel' => $this->channel,
            'project_type' => $this->project_type,
            'project_type_label' => Labels::projectType($this->project_type),
            'status' => $this->status,
            'status_label' => Labels::projectStatus($this->status),
            'title' => $this->title,
            'description' => $this->description,
            'contact_name' => $this->contact_name,
            'contact_email' => $this->contact_email,
            'contact_phone' => $this->contact_phone,
            'company' => $this->company,
            'quantity' => $this->quantity,
            'dimensions' => ['width_mm' => $this->width_mm, 'height_mm' => $this->height_mm, 'depth_mm' => $this->depth_mm],
            'personalization' => $this->personalization,
            'configuration' => $this->configuration,
            'desired_date' => $this->desired_date?->toDateString(),
            'urgency' => $this->urgency,
            'estimate' => [
                'min' => $this->estimate_min,
                'max' => $this->estimate_max,
                'confidence' => $this->estimate_confidence,
            ],
            'product' => $this->whenLoaded('product', fn () => $this->product?->only(['id', 'name', 'slug', 'reference'])),
            'material' => $this->whenLoaded('material', fn () => $this->material?->only(['id', 'name'])),
            'finish' => $this->whenLoaded('finish', fn () => $this->finish?->only(['id', 'name'])),
            'files' => $this->whenLoaded('files', fn () => $this->files->map(fn ($f) => [
                'id' => $f->id,
                'name' => $f->original_name,
                'kind' => $f->kind,
                'mime_type' => $f->mime_type,
                'extension' => $f->extension,
                'size' => $f->size,
                'is_image' => $f->isImage(),
                'url' => $f->temporaryUrl(),
                'preview_url' => $f->isImage() ? $f->temporaryUrl(true) : null,
                'created_at' => $f->created_at,
            ])),
            'quotes' => $this->whenLoaded('quotes', fn () => $this->quotes
                ->when(! $internal, fn ($c) => $c->where('status', '!=', 'draft'))
                ->values()
                ->map(fn ($q) => [
                    'id' => $q->id, 'number' => $q->number, 'status' => $q->status,
                    'status_label' => Labels::quoteStatus($q->status), 'total' => $q->total,
                ])),
            'order' => $this->whenLoaded('order', fn () => $this->order ? [
                'id' => $this->order->id, 'number' => $this->order->number, 'status' => $this->order->status,
                'status_label' => Labels::orderStatus($this->order->status),
            ] : null),
            'timeline' => $this->when(
                $this->relationLoaded('latestQuote') && $this->relationLoaded('order'),
                fn () => Timeline::build($this->resource, $this->latestQuote?->status === 'draft' ? null : $this->latestQuote, $this->order),
            ),
            $this->mergeWhen($internal, fn () => [
                'client' => $this->whenLoaded('client', fn () => $this->client?->only(['id', 'display_name', 'email', 'phone', 'company'])),
                'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee?->only(['id', 'name'])),
                'client_id' => $this->client_id,
                'product_id' => $this->product_id,
                'material_id' => $this->material_id,
                'finish_id' => $this->finish_id,
                'assigned_to' => $this->assigned_to,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
