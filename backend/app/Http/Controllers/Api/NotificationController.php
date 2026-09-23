<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Notifications de l'utilisateur connecté (équipe ou client). */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $paginator = $user->notifications()->paginate(min(50, (int) $request->query('per_page', 15)));
        $paginator->getCollection()->transform(fn ($n) => [
            'id' => $n->id,
            'read_at' => $n->read_at,
            'created_at' => $n->created_at,
        ] + $n->data);

        return $this->paginated($paginator, null, ['unread' => $user->unreadNotifications()->count()]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->whereKey($id)->firstOrFail()->markAsRead();

        return $this->message('Notification lue.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return $this->message('Toutes les notifications sont lues.');
    }
}
