<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Department;
use App\Models\FormTemplate;
use App\Models\PolicyType;
use App\Models\Role;
use App\Models\Section;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => UserRole::SuperAdmin->value, 'display_name' => 'Super Admin', 'description' => 'Full system access'],
            ['name' => UserRole::Admin->value, 'display_name' => 'Admin', 'description' => 'Administrative access'],
            ['name' => UserRole::DepartmentAdmin->value, 'display_name' => 'Department Admin', 'description' => 'Department management'],
            ['name' => UserRole::SectionAdmin->value, 'display_name' => 'Section Admin', 'description' => 'Section management'],
            ['name' => UserRole::Employee->value, 'display_name' => 'Employee', 'description' => 'Standard employee access'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['name' => $role['name']], $role);
        }

        $adminRole = Role::where('name', UserRole::Admin->value)->first();
        $deptAdminRole = Role::where('name', UserRole::DepartmentAdmin->value)->first();
        $sectionAdminRole = Role::where('name', UserRole::SectionAdmin->value)->first();
        $employeeRole = Role::where('name', UserRole::Employee->value)->first();

        $hr = Department::firstOrCreate(
            ['code' => 'HR'],
            ['name' => 'Human Resources', 'description' => 'HR Department', 'status' => 'active']
        );

        $it = Department::firstOrCreate(
            ['code' => 'IT'],
            ['name' => 'Information Technology', 'description' => 'IT Department', 'status' => 'active']
        );

        Department::firstOrCreate(
            ['code' => 'FIN'],
            ['name' => 'Finance', 'description' => 'Finance Department', 'status' => 'active', 'parent_id' => null]
        );

        $policyTypes = [
            ['code' => 'COMPLIANCE', 'title' => 'Compliance'],
            ['code' => 'HR', 'title' => 'Human Resources'],
            ['code' => 'FINANCE', 'title' => 'Finance'],
            ['code' => 'OPERATIONS', 'title' => 'Operations'],
            ['code' => 'IT', 'title' => 'Information Technology'],
        ];

        foreach ($policyTypes as $type) {
            PolicyType::firstOrCreate(['code' => $type['code']], $type);
        }

        $hrRecruitment = Section::firstOrCreate(
            ['department_id' => $hr->id, 'code' => 'REC'],
            ['name' => 'Recruitment', 'description' => 'Recruitment Section', 'status' => 'active']
        );

        $itSupport = Section::firstOrCreate(
            ['department_id' => $it->id, 'code' => 'SUP'],
            ['name' => 'IT Support', 'description' => 'Technical Support', 'status' => 'active']
        );

        $admin = User::updateOrCreate(
            ['email' => 'admin@29.com'],
            [
                'employee_id' => 'EMP-001',
                'name' => 'System Admin',
                'password' => Hash::make('password'),
                'phone' => '09123456789',
                'department_id' => $it->id,
                'section_id' => $itSupport->id,
                'position' => 'System Administrator',
                'role_id' => $adminRole->id,
                'status' => UserStatus::Active,
            ]
        );

        $hrHead = User::updateOrCreate(
            ['email' => 'hr.head@29.com'],
            [
                'employee_id' => 'EMP-002',
                'name' => 'HR Department Admin',
                'password' => Hash::make('password'),
                'phone' => '09123456790',
                'department_id' => $hr->id,
                'section_id' => null,
                'position' => 'Department Admin',
                'role_id' => $deptAdminRole->id,
                'status' => UserStatus::Active,
            ]
        );

        $sectionAdmin = User::updateOrCreate(
            ['email' => 'approver@29.com'],
            [
                'employee_id' => 'EMP-003',
                'name' => 'HR Section Admin',
                'password' => Hash::make('password'),
                'phone' => '09123456791',
                'department_id' => $hr->id,
                'section_id' => $hrRecruitment->id,
                'position' => 'Section Admin',
                'role_id' => $sectionAdminRole->id,
                'status' => UserStatus::Active,
            ]
        );

        User::updateOrCreate(
            ['email' => 'employee1@29.com'],
            [
                'employee_id' => 'EMP-004',
                'name' => 'John Employee',
                'password' => Hash::make('password'),
                'phone' => '09123456792',
                'department_id' => $hr->id,
                'section_id' => $hrRecruitment->id,
                'position' => 'Staff',
                'approver_id' => null,
                'role_id' => $employeeRole->id,
                'status' => UserStatus::Active,
            ]
        );

        User::updateOrCreate(
            ['email' => 'employee2@29.com'],
            [
                'employee_id' => 'EMP-005',
                'name' => 'Jane Employee',
                'password' => Hash::make('password'),
                'phone' => '09123456793',
                'department_id' => $it->id,
                'section_id' => $itSupport->id,
                'position' => 'IT Staff',
                'approver_id' => null,
                'role_id' => $employeeRole->id,
                'status' => UserStatus::Active,
            ]
        );

        $hr->update(['head_id' => $hrHead->id]);
        $it->update(['head_id' => $admin->id]);
        $hrRecruitment->update(['head_id' => $sectionAdmin->id]);
        $itSupport->update(['head_id' => $admin->id]);

        FormTemplate::firstOrCreate(
            ['code' => 'LEAVE-001'],
            [
                'title' => 'Annual Leave Request',
                'description' => 'Submit annual leave application',
                'target_department_id' => $hr->id,
                'status' => 'active',
                'created_by' => $admin->id,
                'fields' => [
                    ['name' => 'start_date', 'label' => 'Start Date', 'type' => 'date', 'required' => true],
                    ['name' => 'end_date', 'label' => 'End Date', 'type' => 'date', 'required' => true],
                    ['name' => 'reason', 'label' => 'Reason', 'type' => 'textarea', 'required' => true],
                ],
            ]
        );

        $this->call(PermissionSeeder::class);
    }
}
