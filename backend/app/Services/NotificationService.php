<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Support\Facades\Notification;

class NotificationService
{
    /** Notifie tous les membres actifs de l'équipe disposant de la permission donnée. */
    public function notifyTeam(string $permission, SystemNotification $notification): void
    {
        $users = User::query()
            ->where('is_active', true)
            ->where(fn ($q) => $q->permission($permission)->orWhereHas('roles', fn ($r) => $r->where('name', 'super_admin')))
            ->get();

        if ($users->isNotEmpty()) {
            Notification::send($users, $notification);
        }
    }

    public function notifyUser(?User $user, SystemNotification $notification): void
    {
        $user?->notify($notification);
    }
}
