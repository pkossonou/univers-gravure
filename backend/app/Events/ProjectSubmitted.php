<?php

namespace App\Events;

use App\Models\Project;
use Illuminate\Foundation\Events\Dispatchable;

class ProjectSubmitted
{
    use Dispatchable;

    public function __construct(public Project $project) {}
}
