<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'color', 'is_direct_cost', 'is_recurring', 'is_active'])]
class ExpenseCategory extends Model
{
    protected function casts(): array
    {
        return ['is_direct_cost' => 'boolean', 'is_recurring' => 'boolean', 'is_active' => 'boolean'];
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}
