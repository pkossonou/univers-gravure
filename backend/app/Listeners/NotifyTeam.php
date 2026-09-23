<?php

namespace App\Listeners;

use App\Events\ClientCreated;
use App\Events\ExpenseRecorded;
use App\Events\OrderStatusChanged;
use App\Events\ProjectSubmitted;
use App\Events\QuoteStatusChanged;
use App\Events\StockLevelLow;
use App\Notifications\SystemNotification;
use App\Services\NotificationService;
use App\Support\Labels;

/**
 * Traduit les événements métier en notifications internes et client.
 * Un seul abonné : la politique de notification reste lisible en un coup d'œil.
 */
class NotifyTeam
{
    public function __construct(private NotificationService $notifier) {}

    public function handleClientCreated(ClientCreated $event): void
    {
        $this->notifier->notifyTeam('clients.view', new SystemNotification(
            'new_client', 'Nouveau client', $event->client->display_name.' a rejoint la base clients.',
            '/admin/clients/'.$event->client->id,
        ));
    }

    public function handleProjectSubmitted(ProjectSubmitted $event): void
    {
        $p = $event->project;
        $this->notifier->notifyTeam('projects.view', new SystemNotification(
            'new_project', 'Nouvelle demande '.$p->number.($p->channel === 'photo_model' ? ' — photo d\'un modèle' : ''),
            sprintf('%s — %s (%d ex.)', $p->contact_name, Labels::projectType($p->project_type), $p->quantity),
            '/admin/demandes/'.$p->id, 'success',
        ));
    }

    public function handleQuoteStatusChanged(QuoteStatusChanged $event): void
    {
        $q = $event->quote;
        match ($q->status) {
            'sent' => $this->notifier->notifyUser($q->client?->user, new SystemNotification(
                'new_quote', 'Votre devis '.$q->number.' est disponible',
                'Consultez-le et validez-le depuis votre espace client.', '/compte/devis/'.$q->id,
            )),
            'accepted' => $this->notifier->notifyTeam('quotes.view', new SystemNotification(
                'quote_accepted', 'Devis '.$q->number.' accepté',
                $q->client?->display_name.' a validé le devis.', '/admin/devis/'.$q->id, 'success',
            )),
            'rejected' => $this->notifier->notifyTeam('quotes.view', new SystemNotification(
                'quote_rejected', 'Devis '.$q->number.' refusé', (string) ($q->rejection_reason ?: 'Sans motif.'),
                '/admin/devis/'.$q->id, 'warning',
            )),
            default => null,
        };
    }

    public function handleOrderStatusChanged(OrderStatusChanged $event): void
    {
        $o = $event->order;
        $label = Labels::orderStatus($o->status);

        if ($event->from === null) {
            $this->notifier->notifyTeam('production.view', new SystemNotification(
                'order_validated', 'Commande '.$o->number.' validée', 'À planifier en production.',
                '/admin/commandes/'.$o->id, 'success',
            ));
        }

        if ($o->status === 'ready') {
            $this->notifier->notifyTeam('orders.view', new SystemNotification(
                'order_ready', 'Commande '.$o->number.' prête', 'Prévenir le client pour retrait / livraison.',
                '/admin/commandes/'.$o->id, 'success',
            ));
        }

        $this->notifier->notifyUser($o->client?->user, new SystemNotification(
            'order_status', 'Commande '.$o->number.' : '.$label,
            $event->comment ?: 'Le statut de votre commande a évolué.', '/compte/commandes/'.$o->id,
        ));
    }

    public function handleStockLevelLow(StockLevelLow $event): void
    {
        $i = $event->item;
        $this->notifier->notifyTeam('stock.view', new SystemNotification(
            'stock_low', 'Stock faible : '.$i->name,
            sprintf('Reste %s %s (seuil %s).', rtrim(rtrim(number_format($i->quantity, 3, ',', ' '), '0'), ','), $i->unit, rtrim(rtrim(number_format($i->alert_threshold, 3, ',', ' '), '0'), ',')),
            '/admin/stock', 'warning',
        ));
    }

    public function handleExpenseRecorded(ExpenseRecorded $event): void
    {
        $e = $event->expense;
        $this->notifier->notifyTeam('expenses.view', new SystemNotification(
            'new_expense', 'Nouvelle dépense', sprintf('%s — %s FCFA', $e->description, number_format($e->amount, 0, ',', ' ')),
            '/admin/depenses',
        ));
    }
}
