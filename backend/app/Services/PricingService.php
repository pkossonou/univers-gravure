<?php

namespace App\Services;

use App\Models\Finish;
use App\Models\Material;
use App\Models\PricingRule;
use App\Models\Product;
use Illuminate\Support\Collection;

/**
 * Calcul d'estimation côté serveur uniquement (voir ARCHITECTURE D4).
 *
 * Renvoie toujours un niveau de confiance :
 *  - firm         : tarif catalogue complet → fourchette serrée, confirmée par devis
 *  - from         : paramètres partiels (dimensions sur mesure, projet sans produit) → « à partir de »
 *  - needs_review : impossible à chiffrer sérieusement → validation par l'équipe
 */
class PricingService
{
    /** Au-delà, une série est toujours revue par l'équipe (tarif négocié). */
    public const LARGE_SERIES = 500;

    private const SPREAD = ['firm' => 0.0, 'from' => 0.3, 'needs_review' => 0.5];

    private Collection $rules;

    /**
     * @param  array{
     *   product_id?: int|null, project_type?: string|null, quantity?: int, width_mm?: int|null, height_mm?: int|null,
     *   material_id?: int|null, finish_id?: int|null, size?: string|null, personalizations?: list<string>,
     *   has_logo?: bool, urgency?: string|null
     * }  $input
     * @return array<string, mixed>
     */
    public function estimate(array $input): array
    {
        $this->rules = PricingRule::query()->where('is_active', true)->orderByDesc('priority')->get();

        $qty = max(1, (int) ($input['quantity'] ?? 1));
        $product = ! empty($input['product_id'])
            ? Product::with('category')->published()->find($input['product_id'])
            : null;
        $material = ! empty($input['material_id']) ? Material::find($input['material_id']) : null;
        $finish = ! empty($input['finish_id']) ? Finish::find($input['finish_id']) : null;
        $width = $input['width_mm'] ?? null;
        $height = $input['height_mm'] ?? null;
        $urgency = $input['urgency'] ?? 'standard';

        $lines = [];
        $reasons = [];
        $confidence = 'firm';

        // 1. Prix unitaire de base
        [$unit, $baseConfidence, $baseReasons, $baseLabel] = $this->baseUnitPrice($product, $input['project_type'] ?? null, $width, $height, $material, $input['size'] ?? null);
        $confidence = $this->worst($confidence, $baseConfidence);
        $reasons = array_merge($reasons, $baseReasons);

        if ($unit === null) {
            return $this->result(null, 'needs_review', $lines, $reasons, $product, $urgency);
        }
        $lines[] = ['label' => $baseLabel, 'amount' => (int) round($unit * $qty), 'detail' => $qty.' × '.number_format($unit, 0, ',', ' ').' FCFA'];

        // 2. Matériau (hors produits vendus au m², déjà intégré au tarif surface)
        $isArea = $product?->price_unit === 'area';
        if ($material && ! $isArea && abs($material->price_multiplier - 1) > 0.001) {
            $delta = $unit * ($material->price_multiplier - 1);
            $lines[] = ['label' => 'Matériau : '.$material->name, 'amount' => (int) round($delta * $qty)];
            $unit += $delta;
        }

        // 3. Finition
        $fixedFees = 0;
        if ($finish) {
            if (abs($finish->price_multiplier - 1) > 0.001) {
                $delta = $unit * ($finish->price_multiplier - 1);
                $lines[] = ['label' => 'Finition : '.$finish->name, 'amount' => (int) round($delta * $qty)];
                $unit += $delta;
            }
            if ($finish->flat_fee > 0) {
                $fixedFees += $finish->flat_fee;
                $lines[] = ['label' => 'Préparation finition '.$finish->name, 'amount' => $finish->flat_fee];
            }
        }

        $goods = $unit * $qty;

        // 4. Remise quantité (sur la marchandise uniquement)
        $tier = $this->rules->where('type', 'quantity_tier')->first(function (PricingRule $r) use ($qty) {
            return $qty >= (int) $r->condition('min_qty', 1)
                && ($r->condition('max_qty') === null || $qty <= (int) $r->condition('max_qty'));
        });
        if ($tier && $tier->amount > 0) {
            $discount = $goods * $tier->amount / 100;
            $lines[] = ['label' => $tier->name, 'amount' => -(int) round($discount)];
            $goods -= $discount;
        }

        // 5. Personnalisation (par unité)
        $perUnitFees = 0;
        foreach (array_unique($input['personalizations'] ?? []) as $mode) {
            $rule = $this->rules->where('type', 'personalization')->first(fn (PricingRule $r) => $r->condition('personalization') === $mode);
            if (! $rule) {
                $confidence = $this->worst($confidence, 'from');
                $reasons[] = "Personnalisation « $mode » chiffrée sur étude.";

                continue;
            }
            $fee = $rule->amount_type === 'percent' ? $unit * $rule->amount / 100 : $rule->amount;
            $perUnitFees += $fee;
            $lines[] = ['label' => $rule->name, 'amount' => (int) round($fee * $qty)];
        }

        // 6. Frais fixes (mise en place, fichier logo…)
        foreach ($this->rules->where('type', 'setup') as $rule) {
            $when = $rule->condition('when', 'always');
            if ($when === 'always' || ($when === 'logo' && ! empty($input['has_logo']))) {
                $fixedFees += (int) $rule->amount;
                $lines[] = ['label' => $rule->name, 'amount' => (int) $rule->amount];
            }
        }

        $total = $goods + $perUnitFees * $qty + $fixedFees;

        // 7. Délai
        $urgencyRule = $this->rules->where('type', 'urgency')->first(fn (PricingRule $r) => $r->condition('urgency') === $urgency);
        if ($urgencyRule && $urgencyRule->amount != 0) {
            $delta = $total * $urgencyRule->amount / 100;
            $lines[] = ['label' => $urgencyRule->name, 'amount' => (int) round($delta)];
            $total += $delta;
        }

        if ($qty > self::LARGE_SERIES) {
            $confidence = 'needs_review';
            $reasons[] = 'Grande série : tarif dégressif négocié avec notre équipe.';
        }

        // Plancher : jamais sous le prix minimum du produit
        if ($product?->min_price && $total < $product->min_price) {
            $total = $product->min_price;
        }

        return $this->result((int) $total, $confidence, $lines, $reasons, $product, $urgency);
    }

    /**
     * @return array{0: float|null, 1: string, 2: list<string>, 3: string}
     */
    private function baseUnitPrice(?Product $product, ?string $projectType, ?int $width, ?int $height, ?Material $material, ?string $size): array
    {
        if (! $product) {
            $rule = $this->rules->where('type', 'category_base')->first(fn (PricingRule $r) => $r->condition('project_type') === $projectType);
            if (! $rule) {
                return [null, 'needs_review', ['Projet sur mesure : chiffrage réalisé par notre équipe.'], ''];
            }
            $unit = (float) $rule->amount;
            $reasons = ['Estimation basée sur un projet type ; le devis précisera le modèle exact.'];
            if (($rule->condition('per') === 'm2')) {
                if (! $width || ! $height) {
                    return [null, 'needs_review', ['Indiquez les dimensions pour obtenir une estimation.'], ''];
                }
                $rate = $material?->price_per_m2 ?: $unit;
                $area = max(0.1, $width * $height / 1_000_000);

                return [$area * $rate, 'from', $reasons, sprintf('Surface %.2f m²', $area)];
            }

            return [$unit, 'from', $reasons, $rule->name];
        }

        if (! $product->base_price) {
            return [null, 'needs_review', ['Ce produit est chiffré sur devis uniquement.'], ''];
        }

        if ($product->price_unit === 'area') {
            if (! $width || ! $height) {
                return [null, 'needs_review', ['Indiquez les dimensions pour obtenir une estimation.'], ''];
            }
            $rate = $material?->price_per_m2 ?: $product->base_price;
            $area = max(0.1, $width * $height / 1_000_000);

            return [$area * $rate, 'firm', [], sprintf('%s — %.2f m²', $product->name, $area)];
        }

        $unit = (float) $product->base_price;
        $confidence = $product->is_price_visible ? 'firm' : 'from';
        $reasons = [];

        $sizeOption = collect($product->size_options ?? [])->firstWhere('label', $size);
        if ($sizeOption) {
            $unit *= (float) ($sizeOption['multiplier'] ?? 1);
        } elseif ($height && ($refHeight = $product->dimensions['height'] ?? null)) {
            // Dimension libre : extrapolation proportionnelle, à confirmer
            $ratio = max(0.5, min(4, $height / $refHeight));
            if (abs($ratio - 1) > 0.05) {
                $unit *= $ratio;
                $confidence = 'from';
                $reasons[] = 'Dimensions sur mesure : prix extrapolé, confirmé au devis.';
            }
        }

        return [$unit, $confidence, $reasons, $product->name.($sizeOption ? ' — '.$sizeOption['label'] : '')];
    }

    private function worst(string $a, string $b): string
    {
        $order = ['firm' => 0, 'from' => 1, 'needs_review' => 2];

        return $order[$a] >= $order[$b] ? $a : $b;
    }

    /** @return array<string, mixed> */
    private function result(?int $total, string $confidence, array $lines, array $reasons, ?Product $product, string $urgency): array
    {
        $min = $total !== null ? (int) (round($total / 100) * 100) : null;
        $max = $min !== null ? (int) (round($min * (1 + self::SPREAD[$confidence]) / 100) * 100) : null;

        $leadMin = $product?->lead_time_min_days ?? 5;
        $leadMax = $product?->lead_time_max_days ?? 10;
        if ($urgency === 'express') {
            [$leadMin, $leadMax] = [max(1, intdiv($leadMin, 2)), max(2, intdiv($leadMax, 2))];
        }

        return [
            'confidence' => $confidence,
            'estimate_min' => $min,
            'estimate_max' => $max,
            'currency' => 'XOF',
            'label' => match ($confidence) {
                'firm' => 'Estimation indicative',
                'from' => 'Estimation à partir de',
                default => 'Votre demande nécessite une validation par notre équipe.',
            },
            'disclaimer' => 'Estimation non contractuelle. Le prix définitif figure sur le devis validé par UNIVERS GRAVURE.',
            'breakdown' => $lines,
            'reasons' => array_values(array_unique($reasons)),
            'lead_time_days' => ['min' => $leadMin, 'max' => $leadMax],
        ];
    }
}
