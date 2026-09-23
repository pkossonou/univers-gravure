<?php

namespace App\Support;

/** Libellés français des statuts et types (utilisés côté API, PDF et notifications). */
final class Labels
{
    public const PROJECT_TYPES = [
        'trophee' => 'Trophée', 'medaille' => 'Médaille', 'plaque' => 'Plaque', 'gravure' => 'Gravure',
        'impression' => 'Impression', 'signaletique' => 'Signalétique', 'objet' => 'Objet personnalisé',
        'cadeau' => "Cadeau d'entreprise", 'autre' => 'Autre',
    ];

    public const PROJECT_STATUSES = [
        'new' => 'Nouvelle demande', 'quote_preparing' => 'Devis en préparation', 'quote_sent' => 'Devis envoyé',
        'awaiting_validation' => 'En attente de validation', 'validated' => 'Validée', 'rejected' => 'Refusée',
        'cancelled' => 'Annulée',
    ];

    public const ORDER_STATUSES = [
        'validated' => 'Validée', 'in_design' => 'En conception', 'in_production' => 'En production',
        'quality_check' => 'Contrôle qualité', 'ready' => 'Prête', 'delivered' => 'Livrée',
        'completed' => 'Terminée', 'cancelled' => 'Annulée',
    ];

    public const QUOTE_STATUSES = [
        'draft' => 'Brouillon', 'sent' => 'Envoyé', 'accepted' => 'Accepté', 'rejected' => 'Refusé',
        'expired' => 'Expiré', 'converted' => 'Converti en commande',
    ];

    public const INVOICE_STATUSES = [
        'draft' => 'Brouillon', 'issued' => 'Émise', 'partially_paid' => 'Partiellement payée',
        'paid' => 'Payée', 'cancelled' => 'Annulée',
    ];

    public const PAYMENT_METHODS = [
        'cash' => 'Espèces', 'mobile_money' => 'Mobile Money', 'bank_transfer' => 'Virement',
        'card' => 'Carte bancaire', 'cheque' => 'Chèque', 'other' => 'Autre',
    ];

    public static function projectType(?string $v): string
    {
        return self::PROJECT_TYPES[$v] ?? (string) $v;
    }

    public static function projectStatus(?string $v): string
    {
        return self::PROJECT_STATUSES[$v] ?? (string) $v;
    }

    public static function orderStatus(?string $v): string
    {
        return self::ORDER_STATUSES[$v] ?? (string) $v;
    }

    public static function quoteStatus(?string $v): string
    {
        return self::QUOTE_STATUSES[$v] ?? (string) $v;
    }

    public static function invoiceStatus(?string $v): string
    {
        return self::INVOICE_STATUSES[$v] ?? (string) $v;
    }

    public static function paymentMethod(?string $v): string
    {
        return self::PAYMENT_METHODS[$v] ?? (string) $v;
    }

    public static function money(int|float|null $amount): string
    {
        return number_format((float) $amount, 0, ',', ' ').' FCFA';
    }
}
