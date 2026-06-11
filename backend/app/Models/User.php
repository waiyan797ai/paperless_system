<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Permission;
use App\Models\Section;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'employee_id',
        'name',
        'email',
        'phone',
        'password',
        'department_id',
        'section_id',
        'position',
        'approver_id',
        'role_id',
        'status',
        'avatar',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => UserStatus::class,
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function subordinates(): HasMany
    {
        return $this->hasMany(User::class, 'approver_id');
    }

    public function formRequests(): HasMany
    {
        return $this->hasMany(FormRequest::class);
    }

    public function requestApprovals(): HasMany
    {
        return $this->hasMany(RequestApproval::class, 'approver_id');
    }

    public function interRequests(): HasMany
    {
        return $this->hasMany(InterRequest::class, 'requester_id');
    }

    public function assignedInterRequests(): HasMany
    {
        return $this->hasMany(InterRequest::class, 'assigned_to');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function hasRole(UserRole|string ...$roles): bool
    {
        $roleName = $this->role?->name;

        if (! $roleName) {
            return false;
        }

        $allowed = array_map(
            fn (UserRole|string $role) => $role instanceof UserRole ? $role->value : $role,
            $roles
        );

        return in_array($roleName, $allowed, true);
    }

    public function isAdminLevel(): bool
    {
        return $this->hasRole(UserRole::SuperAdmin, UserRole::Admin);
    }

    public function isDepartmentAdmin(): bool
    {
        return ($this->hasRole(...UserRole::managerNames()) && $this->department_id)
            || Department::where('head_id', $this->id)->exists();
    }

    public function isSectionAdmin(): bool
    {
        return ($this->hasRole(...UserRole::managerNames()) && $this->section_id)
            || Section::where('head_id', $this->id)->exists();
    }

    /** @deprecated Use isDepartmentAdmin() */
    public function isDepartmentHead(): bool
    {
        return $this->isDepartmentAdmin();
    }

    public function hasPermission(string $slug): bool
    {
        if ($this->isAdminLevel()) {
            return true;
        }

        return $this->role?->permissions()->where('slug', $slug)->exists() ?? false;
    }

    public function permissionSlugs(): array
    {
        if ($this->isAdminLevel()) {
            return Permission::pluck('slug')->all();
        }

        return $this->role?->permissions()->pluck('slug')->all() ?? [];
    }
}
