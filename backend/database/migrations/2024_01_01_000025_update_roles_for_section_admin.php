<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')->where('name', 'department_head')->update([
            'name' => 'department_admin',
            'display_name' => 'Department Admin',
            'description' => 'Department level management',
        ]);

        DB::table('roles')->insertOrIgnore([
            'name' => 'section_admin',
            'display_name' => 'Section Admin',
            'description' => 'Section level management',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('roles')->where('name', 'department_admin')->update([
            'name' => 'department_head',
            'display_name' => 'Department Head',
        ]);

        DB::table('roles')->where('name', 'section_admin')->delete();
    }
};
