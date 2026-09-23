<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'number', 'client_id', 'quote_id', 'project_id', 'created_by', 'status', 'payment_status', 'subtotal',
    'discount_amount', 'tax_amount', 'total', 'cost_estimate', 'ordered_at', 'due_date', 'delivery_method',
    'delivery_address', 'delivered_at', 'completed_at', 'notes',
])]
class Order extends Model
{
    use HasFactory, SoftDeletes;

    /** Ordre du cycle de vie — sert aussi à valider les transitions. */
    public const STATUSES = ['validated', 'in_design', 'in_production', 'quality_check', 'ready', 'delivered', 'completed', 'cancelled'];

    public const OPEN_STATUSES = ['validated', 'in_design', 'in_production', 'quality_check', 'ready'];

    public const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'];

    protected function casts(): array
    {
        return [
            'ordered_at' => 'date',
            'due_date' => 'date',
            'delivered_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('created_at');
    }

    public function productionOrders(): HasMany
    {
        return $this->hasMany(ProductionOrder::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function qrCodes(): HasMany
    {
        return $this->hasMany(QrCode::class);
    }
}
