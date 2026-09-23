<?php

namespace App\Support;

use App\Models\Order;
use App\Models\Project;
use App\Models\Quote;

/**
 * Frise client : DEMANDE → DEVIS → VALIDATION → PRODUCTION → CONTRÔLE → EXPÉDITION / RETRAIT → TERMINÉ.
 * Calculée à partir des vrais statuts (demande, devis, commande). Aucune information interne n'y figure.
 */
final class Timeline
{
    private const STAGES = [
        'request' => 'Demande',
        'quote' => 'Devis',
        'validation' => 'Validation',
        'production' => 'Production',
        'control' => 'Contrôle',
        'delivery' => 'Expédition / retrait',
        'done' => 'Terminé',
    ];

    /** @return array{status: string, status_label: string, is_closed: bool, stages: list<array<string, mixed>>} */
    public static function build(?Project $project, ?Quote $quote, ?Order $order): array
    {
        $orderRank = $order ? array_search($order->status, Order::STATUSES, true) : -1;
        $rankOf = fn (string $s) => array_search($s, Order::STATUSES, true);

        $quoteSent = $quote && in_array($quote->status, ['sent', 'accepted', 'converted', 'rejected', 'expired'], true);
        $quoteAccepted = ($quote && in_array($quote->status, ['accepted', 'converted'], true)) || $order;

        $state = [
            'request' => 'done',
            'quote' => $quoteSent ? 'done' : 'current',
            'validation' => $quoteAccepted ? 'done' : ($quoteSent ? 'current' : 'upcoming'),
            'production' => 'upcoming',
            'control' => 'upcoming',
            'delivery' => 'upcoming',
            'done' => 'upcoming',
        ];

        if ($order && $order->status !== 'cancelled') {
            $state['production'] = $orderRank >= $rankOf('quality_check') ? 'done' : 'current';
            $state['control'] = $orderRank >= $rankOf('ready') ? 'done' : ($order->status === 'quality_check' ? 'current' : 'upcoming');
            $state['delivery'] = $orderRank >= $rankOf('delivered') ? 'done' : ($order->status === 'ready' ? 'current' : 'upcoming');
            $state['done'] = $order->status === 'completed' ? 'done' : ($order->status === 'delivered' ? 'current' : 'upcoming');
        }

        $dates = [
            'request' => $project?->created_at,
            'quote' => $quote?->sent_at,
            'validation' => $quote?->accepted_at ?? $order?->created_at,
            'delivery' => $order?->delivered_at,
            'done' => $order?->completed_at,
        ];

        $stages = [];
        foreach (self::STAGES as $key => $label) {
            $stages[] = [
                'key' => $key,
                'label' => $label,
                'state' => $state[$key],
                'date' => isset($dates[$key]) ? $dates[$key]?->toIso8601String() : null,
            ];
        }

        $status = $order?->status ?? $project?->status ?? 'new';

        return [
            'status' => $status,
            'status_label' => $order ? Labels::orderStatus($order->status) : Labels::projectStatus($project?->status),
            'is_closed' => in_array($status, ['completed', 'cancelled', 'rejected'], true),
            'stages' => $stages,
        ];
    }
}
