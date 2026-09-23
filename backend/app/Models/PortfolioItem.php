<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['title', 'slug', 'category', 'client_label', 'description', 'image_url', 'before_image_url', 'video_url', 'ratio', 'year', 'is_published', 'sort_order'])]
class PortfolioItem extends Model
{
    public const CATEGORIES = ['trophees', 'medailles', 'plaques', 'gravure', 'impression', 'evenements', 'entreprises', 'cadeaux'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean'];
    }
}
