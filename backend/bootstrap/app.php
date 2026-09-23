<?php

use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsureStaff;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(append: [SecurityHeaders::class]);
        $middleware->alias([
            'staff' => EnsureStaff::class,
            'active' => EnsureActiveUser::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Messages d'erreur homogènes en français : { message, errors? }
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }
            if ($e instanceof ValidationException) {
                return response()->json(['message' => 'Certaines informations sont invalides.', 'errors' => $e->errors()], 422);
            }
            if ($e instanceof AuthenticationException) {
                return response()->json(['message' => 'Authentification requise.'], 401);
            }
            if ($e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException) {
                return response()->json(['message' => 'Ressource introuvable.'], 404);
            }
            if ($e instanceof HttpException) {
                return response()->json(['message' => $e->getMessage() ?: 'Erreur.'], $e->getStatusCode(), $e->getHeaders());
            }

            return null;
        });
    })->create();
