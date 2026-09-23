<?php

namespace App\Providers;

use App\Contracts\AiAssistant;
use App\Services\Ai\NullAiAssistant;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AiAssistant::class, NullAiAssistant::class);
    }

    public function boot(): void
    {
        // Le super administrateur a tous les droits
        Gate::before(fn ($user) => $user->hasRole('super_admin') ? true : null);

        // Le serveur Next.js (rendu SSR/ISR) interroge l'API pour tous les visiteurs : il ne doit pas être bridé
        $trustedSsr = array_filter(explode(',', (string) env('TRUSTED_SSR_IPS', '')));
        RateLimiter::for('api', fn (Request $request) => in_array($request->ip(), $trustedSsr, true)
            ? Limit::none()
            : Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));

        // Connexion / inscription : anti force brute
        RateLimiter::for('auth', fn (Request $request) => [
            Limit::perMinute(6)->by(strtolower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        // Formulaires publics (demandes, contact, uploads)
        RateLimiter::for('public-forms', fn (Request $request) => [
            Limit::perMinute(10)->by($request->ip()),
            Limit::perDay(60)->by($request->ip()),
        ]);

        RateLimiter::for('uploads', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));

        RateLimiter::for('estimate', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
    }
}
