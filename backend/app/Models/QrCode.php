<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'code', 'order_id', 'order_item_id', 'client_id', 'type', 'title', 'recipient_name', 'event_name', 'year',
    'category_label', 'organization', 'message', 'photo_url', 'is_public', 'is_active', 'created_by',
])]
#[Appends(['public_url'])]
class QrCode extends Model
{
    public const TYPES = ['trophy', 'medal', 'plaque', 'product'];

    protected function casts(): array
    {
        return ['is_public' => 'boolean', 'is_active' => 'boolean', 'last_scanned_at' => 'datetime'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function certificate(): HasOne
    {
        return $this->hasOne(DigitalCertificate::class);
    }

    protected function publicUrl(): Attribute
    {
        return Attribute::get(fn () => rtrim(config('app.frontend_url'), '/').'/t/'.$this->code);
    }
}
