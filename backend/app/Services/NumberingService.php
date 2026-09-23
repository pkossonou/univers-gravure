<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Génère des numéros métier uniques et lisibles : DEM-2026-00042.
 * Compteur par préfixe et par année, verrouillé en transaction (pas de doublon en concurrence).
 */
class NumberingService
{
    public const PREFIXES = [
        'project' => 'DEM',
        'quote' => 'DEV',
        'order' => 'CMD',
        'invoice' => 'FAC',
        'production' => 'OF',
        'purchase' => 'ACH',
        'certificate' => 'CERT',
    ];

    public function next(string $type, ?int $year = null): string
    {
        $prefix = self::PREFIXES[$type] ?? strtoupper($type);
        $year ??= (int) now()->format('Y');
        $key = "sequence.$prefix.$year";

        $value = DB::transaction(function () use ($key) {
            $row = DB::table('settings')->where('key', $key)->lockForUpdate()->first();
            $next = $row ? ((int) json_decode($row->value)) + 1 : 1;

            if ($row) {
                DB::table('settings')->where('key', $key)->update(['value' => json_encode($next), 'updated_at' => now()]);
            } else {
                DB::table('settings')->insert([
                    'group' => 'sequences', 'key' => $key, 'value' => json_encode($next),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            return $next;
        });

        return sprintf('%s-%d-%05d', $prefix, $year, $value);
    }
}
