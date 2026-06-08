<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Policy extends Model
{
    protected $fillable = [
        'title',
        'description',
        'policy_type_id',
        'file_path',
        'file_name',
        'version',
        'effective_date',
        'status',
        'created_by',
        'created_department_id',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'effective_date' => 'date',
        ];
    }

    public function policyType(): BelongsTo
    {
        return $this->belongsTo(PolicyType::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function createdDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'created_department_id');
    }
}
