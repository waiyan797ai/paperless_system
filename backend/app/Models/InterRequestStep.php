<?php

namespace App\Models;

use App\Enums\InterRequestStepAction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterRequestStep extends Model
{
    protected $fillable = [
        'inter_request_id',
        'user_id',
        'assigned_to_id',
        'action',
        'remark',
    ];

    protected function casts(): array
    {
        return [
            'action' => InterRequestStepAction::class,
        ];
    }

    public function interRequest(): BelongsTo
    {
        return $this->belongsTo(InterRequest::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }
}
