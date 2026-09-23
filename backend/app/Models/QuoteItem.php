<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['quote_id', 'product_id', 'description', 'quantity', 'unit_price', 'unit_cost', 'discount', 'total', 'options', 'sort_order'])]
class QuoteItem extends Model
{
    protected function casts(): array
    {
        return ['options' => 'array'];
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
