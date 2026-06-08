<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterRequestAttachment extends Model
{
    protected $fillable = [
        'inter_request_id',
        'uploaded_by',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
    ];

    public function interRequest(): BelongsTo
    {
        return $this->belongsTo(InterRequest::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
