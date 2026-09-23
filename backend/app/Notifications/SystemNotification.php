<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification générique (interne + client).
 * Canaux pilotés par config('notifications.channels') : database en V1, mail / WhatsApp / SMS ensuite
 * (ajouter un canal = ajouter une classe Channel et son nom dans la config).
 */
class SystemNotification extends Notification
{
    use Queueable;

    /**
     * @param  string  $type  new_client | new_project | new_quote | quote_accepted | order_validated | order_ready | stock_low | new_expense | order_status
     */
    public function __construct(
        public string $type,
        public string $title,
        public string $body,
        public ?string $url = null,
        public string $level = 'info',
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return config('notifications.channels', ['database']);
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'url' => $this->url,
            'level' => $this->level,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)->subject($this->title)->line($this->body);
        if ($this->url) {
            $mail->action('Voir', rtrim(config('app.frontend_url'), '/').$this->url);
        }

        return $mail;
    }
}
