<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['number', 'qr_code_id', 'order_id', 'recipient_name', 'award_title', 'event_name', 'organization', 'issued_on', 'verification_hash', 'is_revoked', 'created_by'])]
#[Appends(['verify_url'])]
class DigitalCertificate extends Model
{
    protected function casts(): array
    {
        return ['issued_on' => 'date', 'is_revoked' => 'boolean'];
    }

    public function qrCode(): BelongsTo
    {
        return $this->belongsTo(QrCode::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function computeHash(): string
    {
        return hash('sha256', implode('|', [
            $this->number, $this->recipient_name, $this->award_title, $this->event_name,
            $this->organization, $this->issued_on?->toDateString(), config('app.key'),
        ]));
    }

    public function isAuthentic(): bool
    {
        return ! $this->is_revoked && hash_equals($this->verification_hash, $this->computeHash());
    }

    protected function verifyUrl(): Attribute
    {
        return Attribute::get(fn () => rtrim(config('app.frontend_url'), '/').'/certificats/'.$this->number);
    }
}
