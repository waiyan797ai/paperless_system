<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case Admin = 'admin';
    case DepartmentAdmin = 'department_admin';
    case SectionAdmin = 'section_admin';
    case Employee = 'employee';

    /** @deprecated Use DepartmentAdmin */
    case DepartmentHead = 'department_head';

    /** @deprecated No longer used — use workflow assignment */
    case Approver = 'approver';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::Admin => 'Admin',
            self::DepartmentAdmin, self::DepartmentHead => 'Department Admin',
            self::SectionAdmin => 'Section Admin',
            self::Employee => 'Employee',
        };
    }

    public function isAdminLevel(): bool
    {
        return in_array($this, [self::SuperAdmin, self::Admin], true);
    }

    public function isDepartmentAdminLevel(): bool
    {
        return in_array($this, [self::DepartmentAdmin, self::DepartmentHead], true);
    }
}
