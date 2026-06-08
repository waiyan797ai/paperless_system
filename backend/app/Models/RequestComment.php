<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestComment extends Model
{
    protected $fillable = [
        'form_request_id',
        'user_id',
        'comment',
    ];

    public function formRequest(): BelongsTo
    {
        return $this->belongsTo(FormRequest::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
