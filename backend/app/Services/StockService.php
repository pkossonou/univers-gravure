<?php

namespace App\Services;

use App\Events\StockLevelLow;
use App\Models\Purchase;
use App\Models\StockItem;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockService
{
    /**
     * Applique un mouvement de stock.
     *  - in / out : $quantity est une quantité positive
     *  - adjustment : $quantity est la NOUVELLE quantité constatée (inventaire)
     */
    public function move(StockItem $item, string $type, float $quantity, ?string $reason = null, ?Model $reference = null, ?int $unitCost = null): StockMovement
    {
        return DB::transaction(function () use ($item, $type, $quantity, $reason, $reference, $unitCost) {
            $item = StockItem::query()->lockForUpdate()->findOrFail($item->id);
            $before = (float) $item->quantity;
            $wasLow = $item->is_low;

            $delta = match ($type) {
                'in' => abs($quantity),
                'out' => -abs($quantity),
                'adjustment' => $quantity - $before,
                default => throw ValidationException::withMessages(['type' => 'Type de mouvement inconnu.']),
            };

            if ($before + $delta < 0) {
                throw ValidationException::withMessages([
                    'quantity' => sprintf('Stock insuffisant : %s %s disponible(s).', rtrim(rtrim(number_format($before, 3, '.', ''), '0'), '.'), $item->unit),
                ]);
            }

            $movement = $item->movements()->create([
                'type' => $type,
                'quantity' => $delta,
                'quantity_before' => $before,
                'quantity_after' => $before + $delta,
                'unit_cost' => $unitCost ?? $item->unit_cost,
                'reason' => $reason,
                'reference_type' => $reference?->getMorphClass(),
                'reference_id' => $reference?->getKey(),
                'user_id' => auth()->id(),
                'moved_at' => now(),
            ]);

            $item->quantity = $before + $delta;
            if ($type === 'in' && $unitCost) {
                // Coût moyen pondéré
                $item->unit_cost = $before + $delta > 0
                    ? (int) round(($before * $item->unit_cost + abs($delta) * $unitCost) / ($before + $delta))
                    : $unitCost;
            }
            $item->save();

            if (! $wasLow && $item->is_low) {
                StockLevelLow::dispatch($item);
            }

            return $movement;
        });
    }

    /** Réception d'un achat fournisseur : entrées en stock + dépense « matières premières ». */
    public function receivePurchase(Purchase $purchase, int $expenseCategoryId): Purchase
    {
        if ($purchase->status !== 'ordered') {
            throw ValidationException::withMessages(['status' => 'Cet achat a déjà été traité.']);
        }

        return DB::transaction(function () use ($purchase, $expenseCategoryId) {
            foreach ($purchase->items()->with('stockItem')->get() as $line) {
                if ($line->stockItem) {
                    $this->move($line->stockItem, 'in', $line->quantity, 'Réception '.$purchase->number, $purchase, $line->unit_price);
                }
            }
            $purchase->update(['status' => 'received', 'received_at' => now()]);

            $purchase->expense()->create([
                'reference' => $purchase->number,
                'expense_date' => today(),
                'expense_category_id' => $expenseCategoryId,
                'supplier_id' => $purchase->supplier_id,
                'description' => 'Achat '.$purchase->number.' — '.$purchase->supplier->name,
                'amount' => $purchase->total,
                'payment_method' => 'bank_transfer',
                'recorded_by' => auth()->id(),
            ]);

            ActivityLogger::log('purchase.received', $purchase, "Achat {$purchase->number} réceptionné");

            return $purchase;
        });
    }
}
