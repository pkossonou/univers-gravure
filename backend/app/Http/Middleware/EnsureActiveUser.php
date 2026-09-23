<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Un compte désactivé perd immédiatement l'accès, même avec un jeton encore valide. */
class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && ! $request->user()->is_active) {
            $request->user()->currentAccessToken()?->delete();
            abort(401, 'Compte désactivé.');
        }

        return $next($request);
    }
}
