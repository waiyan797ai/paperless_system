<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissions = [
            ['slug' => 'meetings.create', 'name' => 'Create Meetings', 'group' => 'meetings', 'description' => 'Can schedule and create new meetings'],
            ['slug' => 'meetings.edit', 'name' => 'Edit Meetings', 'group' => 'meetings', 'description' => 'Can edit meeting details'],
            ['slug' => 'meetings.delete', 'name' => 'Delete Meetings', 'group' => 'meetings', 'description' => 'Can delete meetings'],
            ['slug' => 'meetings.manage_participants', 'name' => 'Manage Participants', 'group' => 'meetings', 'description' => 'Can add/remove participants and groups'],
            ['slug' => 'meetings.take_minutes', 'name' => 'Take Minutes', 'group' => 'meetings', 'description' => 'Can write official meeting minutes'],
            ['slug' => 'meetings.lock_minutes', 'name' => 'Lock Minutes', 'group' => 'meetings', 'description' => 'Can lock/finalize meeting minutes'],
            ['slug' => 'meetings.manage_action_items', 'name' => 'Manage Action Items', 'group' => 'meetings', 'description' => 'Can create and assign action items'],
        ];

        foreach ($permissions as $p) {
            $exists = DB::table('permissions')->where('slug', $p['slug'])->exists();
            if (!$exists) {
                DB::table('permissions')->insert(array_merge($p, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }

        // Assign all meeting permissions to admin role (role_id = 1 typically)
        $adminRoleId = DB::table('roles')->where('name', 'admin')->value('id');
        if ($adminRoleId) {
            foreach ($permissions as $p) {
                $permId = DB::table('permissions')->where('slug', $p['slug'])->value('id');
                if ($permId) {
                    $exists = DB::table('permission_role')
                        ->where('permission_id', $permId)
                        ->where('role_id', $adminRoleId)
                        ->exists();
                    if (!$exists) {
                        DB::table('permission_role')->insert([
                            'permission_id' => $permId,
                            'role_id' => $adminRoleId,
                        ]);
                    }
                }
            }
        }

        // Meeting management permissions are intentionally admin-only
        // Manager roles should only edit their own speaking data, not manage meetings
    }

    public function down(): void
    {
        $slugs = [
            'meetings.create', 'meetings.edit', 'meetings.delete',
            'meetings.manage_participants', 'meetings.take_minutes',
            'meetings.lock_minutes', 'meetings.manage_action_items',
        ];
        DB::table('permissions')->whereIn('slug', $slugs)->delete();
    }
};
