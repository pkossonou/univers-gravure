<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Réserve le back-office aux comptes de l'équipe, actifs. */
class EnsureStaff
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user && $user->is_active && $user->isStaff(), 403, 'Accès réservé à l\'équipe UNIVERS GRAVURE.');

        return $next($request);
    }
}
