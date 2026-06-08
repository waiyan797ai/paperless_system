<?php

namespace App\Models;

use App\Enums\InterRequestStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InterRequest extends Model
{
    protected $fillable = [
        'reference_no',
        'requester_id',
        'from_department_id',
        'to_department_id',
        'assigned_to',
        'subject',
        'description',
        'status',
        'priority',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => InterRequestStatus::class,
            'completed_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function fromDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'from_department_id');
    }

    public function toDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'to_department_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(InterRequestComment::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(InterRequestAttachment::class);
    }
}
