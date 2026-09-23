<?php

namespace App\Events;

use App\Models\Client;
use Illuminate\Foundation\Events\Dispatchable;

class ClientCreated
{
    use Dispatchable;

    public function __construct(public Client $client) {}
}
