<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ClientAreaController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProjectIntakeController;
use App\Http\Controllers\Api\PublicRecordController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API UNIVERS GRAVURE — v1
|--------------------------------------------------------------------------
| Public  : catalogue, estimation, dépôt de projet, suivi, QR, certificats
| /me     : espace client (auth:sanctum)
| /admin  : back-office (auth:sanctum + staff + permissions par action)
*/

Route::prefix('v1')->middleware('throttle:api')->group(function () {

    // ---- Public -----------------------------------------------------------
    Route::prefix('catalog')->controller(CatalogController::class)->group(function () {
        Route::get('categories', 'categories');
        Route::get('categories/{slug}', 'category');
        Route::get('products', 'products');
        Route::get('products/{slug}', 'product')->name('catalog.products.show');
        Route::get('materials', 'materials');
        Route::get('finishes', 'finishes');
        Route::get('filters', 'filters');
    });
    Route::get('portfolio', [CatalogController::class, 'portfolio']);
    Route::get('content', [ContentController::class, 'show']);

    Route::controller(ProjectIntakeController::class)->group(function () {
        Route::post('pricing/estimate', 'estimate')->middleware('throttle:estimate');
        Route::post('uploads', 'upload')->middleware('throttle:uploads');
        Route::delete('uploads/{token}', 'discardUpload')->middleware('throttle:uploads');
        Route::post('projects', 'submit')->middleware('throttle:public-forms');
        Route::get('projects/track/{number}', 'track')->middleware('throttle:public-forms');
        Route::post('contact', 'contact')->middleware('throttle:public-forms');
    });

    Route::controller(PublicRecordController::class)->group(function () {
        Route::get('trophies/{code}', 'trophy');
        Route::get('certificates/{number}', 'certificate');
        Route::get('certificates/{number}/pdf', 'certificatePdf');
        Route::get('files/{file}', 'download')->middleware('signed')->name('files.download');
    });

    // ---- Authentification ---------------------------------------------------
    Route::prefix('auth')->controller(AuthController::class)->group(function () {
        Route::post('register', 'register')->middleware('throttle:auth');
        Route::post('login', 'login')->middleware('throttle:auth');
        Route::middleware(['auth:sanctum', 'active'])->group(function () {
            Route::post('logout', 'logout');
            Route::get('me', 'me');
            Route::put('profile', 'updateProfile');
            Route::put('password', 'updatePassword');
        });
    });

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);

        // ---- Espace client --------------------------------------------------
        Route::prefix('me')->controller(ClientAreaController::class)->group(function () {
            Route::get('overview', 'overview');
            Route::get('projects', 'projects');
            Route::get('projects/{id}', 'project')->whereNumber('id');
            Route::get('quotes', 'quotes');
            Route::get('quotes/{id}', 'quote')->whereNumber('id');
            Route::post('quotes/{id}/accept', 'acceptQuote')->whereNumber('id');
            Route::post('quotes/{id}/reject', 'rejectQuote')->whereNumber('id');
            Route::get('quotes/{id}/pdf', 'quotePdf')->whereNumber('id');
            Route::get('orders', 'orders');
            Route::get('orders/{id}', 'order')->whereNumber('id');
            Route::get('invoices', 'invoices');
            Route::get('invoices/{id}/pdf', 'invoicePdf')->whereNumber('id');
            Route::get('files', 'files');
        });

        // ---- Back-office ----------------------------------------------------
        Route::prefix('admin')->middleware('staff')->group(function () {
            Route::get('dashboard', Admin\DashboardController::class);
            Route::get('finance', Admin\FinanceController::class);
            Route::get('reports', [Admin\ReportController::class, 'index']);
            Route::get('reports/{type}', [Admin\ReportController::class, 'generate']);
            Route::get('lookups', [Admin\SystemController::class, 'lookups']);
            Route::get('search', [Admin\SystemController::class, 'search']);
            Route::get('settings', [Admin\SystemController::class, 'settings']);
            Route::put('settings', [Admin\SystemController::class, 'updateSettings']);
            Route::get('activity', [Admin\SystemController::class, 'activity']);
            Route::get('content', [ContentController::class, 'edit']);
            Route::put('content', [ContentController::class, 'update']);

            // CRM
            Route::apiResource('clients', Admin\ClientController::class);
            Route::post('clients/{id}/restore', [Admin\ClientController::class, 'restore']);
            Route::apiResource('leads', Admin\LeadController::class);
            Route::post('leads/{id}/convert', [Admin\LeadController::class, 'convert']);

            // Catalogue
            Route::apiResource('products', Admin\ProductController::class);
            Route::post('products/{product}/images', [Admin\ProductController::class, 'uploadImage']);
            Route::delete('products/{product}/images/{image}', [Admin\ProductController::class, 'deleteImage']);
            Route::apiResource('categories', Admin\CategoryController::class);
            Route::apiResource('materials', Admin\MaterialController::class);
            Route::apiResource('finishes', Admin\FinishController::class);
            Route::apiResource('tags', Admin\TagController::class);
            Route::apiResource('portfolio', Admin\PortfolioController::class);
            Route::apiResource('pricing-rules', Admin\PricingRuleController::class);

            // Commercial
            Route::apiResource('projects', Admin\ProjectController::class)->only(['index', 'show', 'update']);
            Route::post('projects/{project}/draft-quote', [Admin\ProjectController::class, 'draftQuote']);
            Route::apiResource('quotes', Admin\QuoteController::class);
            Route::post('quotes/{quote}/send', [Admin\QuoteController::class, 'send']);
            Route::post('quotes/{quote}/accept', [Admin\QuoteController::class, 'accept']);
            Route::post('quotes/{quote}/reject', [Admin\QuoteController::class, 'reject']);
            Route::get('quotes/{quote}/pdf', [Admin\QuoteController::class, 'pdf']);

            // Atelier
            Route::apiResource('orders', Admin\OrderController::class)->only(['index', 'show', 'update']);
            Route::post('orders/{order}/status', [Admin\OrderController::class, 'status']);
            Route::post('orders/{order}/invoice', [Admin\OrderController::class, 'invoice']);
            Route::get('production', [Admin\ProductionController::class, 'board']);
            Route::patch('production/{productionOrder}', [Admin\ProductionController::class, 'update']);
            Route::patch('production-steps/{step}', [Admin\ProductionController::class, 'updateStep']);
            Route::apiResource('stock-items', Admin\StockItemController::class);
            Route::get('stock-items/{id}/movements', [Admin\StockItemController::class, 'movements']);
            Route::post('stock-items/{id}/movements', [Admin\StockItemController::class, 'move']);
            Route::apiResource('suppliers', Admin\SupplierController::class);
            Route::apiResource('purchases', Admin\PurchaseController::class)->only(['index', 'show', 'store']);
            Route::post('purchases/{purchase}/receive', [Admin\PurchaseController::class, 'receive']);
            Route::post('purchases/{purchase}/cancel', [Admin\PurchaseController::class, 'cancel']);

            // Finances
            Route::apiResource('expenses', Admin\ExpenseController::class);
            Route::get('expenses/{expense}/receipt', [Admin\ExpenseController::class, 'receipt']);
            Route::apiResource('expense-categories', Admin\ExpenseCategoryController::class);
            Route::apiResource('revenues', Admin\RevenueController::class);
            Route::get('invoices', [Admin\InvoiceController::class, 'index']);
            Route::get('invoices/{invoice}', [Admin\InvoiceController::class, 'show']);
            Route::post('invoices/{invoice}/issue', [Admin\InvoiceController::class, 'issue']);
            Route::post('invoices/{invoice}/cancel', [Admin\InvoiceController::class, 'cancel']);
            Route::post('invoices/{invoice}/payments', [Admin\InvoiceController::class, 'payment']);
            Route::get('invoices/{invoice}/pdf', [Admin\InvoiceController::class, 'pdf']);

            // Objets connectés
            Route::apiResource('qr-codes', Admin\QrCodeController::class);
            Route::get('qr-codes/{id}/svg', [Admin\QrCodeController::class, 'svg']);
            Route::get('certificates', [Admin\CertificateController::class, 'index']);
            Route::post('certificates', [Admin\CertificateController::class, 'store']);
            Route::post('certificates/{certificate}/revoke', [Admin\CertificateController::class, 'revoke']);
            Route::get('certificates/{certificate}/pdf', [Admin\CertificateController::class, 'pdf']);

            // Système
            Route::get('roles', [Admin\UserController::class, 'roles']);
            Route::apiResource('users', Admin\UserController::class)->except(['show']);
        });
    });
});
