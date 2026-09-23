<?php

/*
 * Routeur du serveur PHP intégré pour le développement (`composer serve`).
 * Sert les fichiers existants de public/ (images, /storage…) et transmet le reste à Laravel.
 * Utilisé à la place de `php artisan serve` pour pouvoir relever les limites d'envoi de fichiers.
 */

$public = __DIR__.'/public';
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/');

if ($uri !== '/' && is_file($public.$uri)) {
    return false;
}

chdir($public);
require_once $public.'/index.php';
