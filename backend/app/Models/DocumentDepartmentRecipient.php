<?php

namespace App\Models;

use App\Enums\DocumentRecipientStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentDepartmentRecipient extends Model
{
    protected $fillable = [
        'document_distribution_id',
        'department_id',
        'status',
        'viewed_at',
        'acknowledged_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => DocumentRecipientStatus::class,
            'viewed_at' => 'datetime',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function distribution(): BelongsTo
    {
        return $this->belongsTo(DocumentDistribution::class, 'document_distribution_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
