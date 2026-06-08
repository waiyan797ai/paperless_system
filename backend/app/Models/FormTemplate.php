<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormTemplate extends Model
{
    protected $fillable = [
        'code',
        'title',
        'description',
        'fields',
        'target_department_id',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'fields' => 'array',
        ];
    }

    public function targetDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'target_department_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function formRequests(): HasMany
    {
        return $this->hasMany(FormRequest::class);
    }
}
