<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('roles')->where('name', 'department_admin')->exists()) {
            DB::table('roles')->where('name', 'department_admin')->update([
                'name' => 'manager',
                'display_name' => 'Manager',
                'description' => 'Department and section management',
            ]);
        }

        $managerRole = DB::table('roles')->where('name', 'manager')->first();

        foreach (['section_admin', 'department_head'] as $legacyRole) {
            $legacy = DB::table('roles')->where('name', $legacyRole)->first();
            if (! $legacy || ! $managerRole) {
                continue;
            }

            DB::table('users')->where('role_id', $legacy->id)->update([
                'role_id' => $managerRole->id,
            ]);
            DB::table('permission_role')->where('role_id', $legacy->id)->delete();
            DB::table('roles')->where('id', $legacy->id)->delete();
        }

        DB::table('roles')->where('name', 'employee')->update([
            'name' => 'user',
            'display_name' => 'User',
            'description' => 'Standard user access',
        ]);

        DB::table('roles')->where('name', 'super_admin')->update([
            'display_name' => 'Super Admin',
        ]);

        DB::table('roles')->where('name', 'admin')->update([
            'display_name' => 'Admin',
        ]);

        DB::table('roles')->where('name', 'approver')->delete();
    }

    public function down(): void
    {
        DB::table('roles')->where('name', 'manager')->update([
            'name' => 'department_admin',
            'display_name' => 'Department Admin',
            'description' => 'Department management',
        ]);

        DB::table('roles')->where('name', 'user')->update([
            'name' => 'employee',
            'display_name' => 'Employee',
            'description' => 'Standard employee access',
        ]);

        if (! DB::table('roles')->where('name', 'section_admin')->exists()) {
            DB::table('roles')->insert([
                'name' => 'section_admin',
                'display_name' => 'Section Admin',
                'description' => 'Section management',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
};
