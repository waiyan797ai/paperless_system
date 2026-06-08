<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentDistribution extends Model
{
    protected $fillable = [
        'document_id',
        'distributed_by',
        'notes',
        'distributed_at',
    ];

    protected function casts(): array
    {
        return [
            'distributed_at' => 'datetime',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function distributor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'distributed_by');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(DocumentDepartmentRecipient::class);
    }
}
