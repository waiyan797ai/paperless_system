<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormRequestCcUser extends Model
{
    protected $fillable = [
        'form_request_id',
        'user_id',
        'added_by_id',
    ];

    public function formRequest(): BelongsTo
    {
        return $this->belongsTo(FormRequest::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by_id');
    }
}
