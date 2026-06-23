<?php

namespace App\Models;

use App\Enums\RequestStatus;
use App\Enums\RequestType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormRequest extends Model
{
    protected $fillable = [
        'reference_no',
        'user_id',
        'form_template_id',
        'target_department_id',
        'review_department_id',
        'dept_reviewed_by_id',
        'dept_reviewed_at',
        'endorsed_by_source_at',
        'target_section_id',
        'assigned_to_id',
        'assigned_by_id',
        'assigned_at',
        'final_approved_by_id',
        'final_approved_at',
        'type',
        'title',
        'description',
        'status',
        'data',
        'submitted_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => RequestType::class,
            'status' => RequestStatus::class,
            'data' => 'array',
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
            'assigned_at' => 'datetime',
            'dept_reviewed_at' => 'datetime',
            'endorsed_by_source_at' => 'datetime',
            'final_approved_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function formTemplate(): BelongsTo
    {
        return $this->belongsTo(FormTemplate::class);
    }

    public function targetDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'target_department_id');
    }

    public function reviewDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'review_department_id');
    }

    public function deptReviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dept_reviewed_by_id');
    }

    public function targetSection(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'target_section_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_id');
    }

    public function finalApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'final_approved_by_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(RequestComment::class)->latest();
    }

    public function actions(): HasMany
    {
        return $this->hasMany(FormRequestAction::class)->orderBy('created_at');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(RequestApproval::class)->orderBy('step');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(FormRequestAttachment::class)->latest();
    }

    public function ccUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'form_request_cc_users')
            ->withTimestamps()
            ->withPivot('added_by_id');
    }
}
