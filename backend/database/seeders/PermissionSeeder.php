<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['slug' => 'dashboard.view', 'name' => 'View Dashboard', 'group' => 'dashboard'],
            ['slug' => 'policies.view', 'name' => 'View Policies', 'group' => 'policies'],
            ['slug' => 'policies.manage', 'name' => 'Manage Policies', 'group' => 'policies'],
            ['slug' => 'form_templates.manage', 'name' => 'Manage Form Templates', 'group' => 'forms'],
            ['slug' => 'form_requests.create', 'name' => 'Create Form Requests', 'group' => 'requests'],
            ['slug' => 'form_requests.dept_inbox', 'name' => 'Department Inbox', 'group' => 'requests'],
            ['slug' => 'form_requests.section_inbox', 'name' => 'Section Inbox', 'group' => 'requests'],
            ['slug' => 'form_requests.forward_section', 'name' => 'Forward to Section', 'group' => 'requests'],
            ['slug' => 'form_requests.approve', 'name' => 'Approve/Reject Requests', 'group' => 'requests'],
            ['slug' => 'users.manage', 'name' => 'Manage Users', 'group' => 'admin'],
            ['slug' => 'departments.manage', 'name' => 'Manage Departments', 'group' => 'admin'],
            ['slug' => 'sections.manage', 'name' => 'Manage Sections', 'group' => 'admin'],
            ['slug' => 'roles.manage', 'name' => 'Manage Roles & Permissions', 'group' => 'admin'],
            ['slug' => 'audit.view', 'name' => 'View Audit Logs', 'group' => 'admin'],
            ['slug' => 'reports.view', 'name' => 'View Reports', 'group' => 'admin'],
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(['slug' => $permission['slug']], $permission);
        }

        $all = Permission::pluck('id')->all();

        $managerPermissions = [
            'dashboard.view', 'policies.view', 'policies.manage', 'form_requests.create',
            'form_requests.dept_inbox', 'form_requests.forward_section', 'form_requests.section_inbox',
            'form_requests.approve', 'sections.manage', 'reports.view',
        ];

        $roleMap = [
            UserRole::SuperAdmin->value => $all,
            UserRole::Admin->value => $all,
            UserRole::Manager->value => $managerPermissions,
            UserRole::User->value => [
                'dashboard.view', 'policies.view', 'form_requests.create',
                'form_requests.approve',
            ],
        ];

        foreach ($roleMap as $roleName => $slugs) {
            $role = Role::where('name', $roleName)->first();
            if (! $role) {
                continue;
            }

            $ids = is_array($slugs) && isset($slugs[0]) && is_numeric($slugs[0])
                ? $slugs
                : Permission::whereIn('slug', $slugs)->pluck('id')->all();

            $role->permissions()->sync($ids);
        }
    }
}
