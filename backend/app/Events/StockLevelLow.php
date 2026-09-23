<?php

namespace App\Events;

use App\Models\StockItem;
use Illuminate\Foundation\Events\Dispatchable;

class StockLevelLow
{
    use Dispatchable;

    public function __construct(public StockItem $item) {}
}
