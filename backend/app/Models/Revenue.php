<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Recette hors facture (vente comptoir, prestation ponctuelle).
 */
#[Fillable(['reference', 'revenue_date', 'client_id', 'order_id', 'category_id', 'source', 'description', 'amount', 'payment_method', 'recorded_by'])]
class Revenue extends Model
{
    use SoftDeletes;

    public const SOURCES = ['vente_comptoir', 'prestation', 'autre'];

    protected function casts(): array
    {
        return ['revenue_date' => 'date', 'amount' => 'integer'];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
