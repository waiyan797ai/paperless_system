<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case Admin = 'admin';
    case Manager = 'manager';
    case User = 'user';

    /** @deprecated Use Manager */
    case DepartmentAdmin = 'department_admin';

    /** @deprecated Use Manager */
    case SectionAdmin = 'section_admin';

    /** @deprecated Use User */
    case Employee = 'employee';

    /** @deprecated Use Manager */
    case DepartmentHead = 'department_head';

    /** @deprecated No longer used */
    case Approver = 'approver';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::Admin => 'Admin',
            self::Manager, self::DepartmentAdmin, self::SectionAdmin, self::DepartmentHead => 'Manager',
            self::User, self::Employee => 'User',
            self::Approver => 'Approver',
        };
    }

    public function isAdminLevel(): bool
    {
        return in_array($this, [self::SuperAdmin, self::Admin], true);
    }

    public function isManagerLevel(): bool
    {
        return in_array($this, [self::Manager, self::DepartmentAdmin, self::SectionAdmin, self::DepartmentHead], true);
    }

    /** @return list<string> */
    public static function managerNames(): array
    {
        return ['manager', 'department_admin', 'department_head', 'section_admin'];
    }

    /** @return list<string> */
    public static function userNames(): array
    {
        return ['user', 'employee'];
    }
}
