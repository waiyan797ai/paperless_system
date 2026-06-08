<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterRequestComment extends Model
{
    protected $fillable = [
        'inter_request_id',
        'user_id',
        'comment',
    ];

    public function interRequest(): BelongsTo
    {
        return $this->belongsTo(InterRequest::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
