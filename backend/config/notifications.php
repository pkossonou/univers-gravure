<?php

return [
    /*
    | Canaux actifs pour les notifications système.
    | V1 : database. Ajouter 'mail' une fois MAIL_* configuré ; WhatsApp / SMS via des canaux personnalisés.
    */
    'channels' => array_filter(explode(',', env('NOTIFICATION_CHANNELS', 'database'))),
];
