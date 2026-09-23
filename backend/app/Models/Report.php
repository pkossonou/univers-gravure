<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Journal des rapports générés (traçabilité des exports). */
#[Fillable(['type', 'format', 'period_start', 'period_end', 'parameters', 'generated_by'])]
class Report extends Model
{
    public const TYPES = ['financial', 'clients', 'sales', 'expenses', 'production'];

    protected function casts(): array
    {
        return ['parameters' => 'array', 'period_start' => 'date', 'period_end' => 'date'];
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
