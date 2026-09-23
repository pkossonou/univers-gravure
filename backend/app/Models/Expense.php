<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['reference', 'expense_date', 'expense_category_id', 'supplier_id', 'purchase_id', 'order_id', 'description', 'amount', 'payment_method', 'receipt_path', 'recorded_by'])]
#[Hidden(['receipt_path'])]
class Expense extends Model
{
    use HasFactory, SoftDeletes;

    public const PAYMENT_METHODS = ['cash', 'mobile_money', 'bank_transfer', 'card', 'cheque', 'other'];

    protected function casts(): array
    {
        return ['expense_date' => 'date', 'amount' => 'integer'];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
