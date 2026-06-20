<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $slugs = [
            'meetings.create',
            'meetings.edit',
            'meetings.delete',
            'meetings.manage_participants',
            'meetings.take_minutes',
            'meetings.lock_minutes',
            'meetings.manage_action_items',
        ];

        $permIds = DB::table('permissions')
            ->whereIn('slug', $slugs)
            ->pluck('id');

        $managerRoleIds = DB::table('roles')
            ->whereIn('name', ['manager', 'department_head', 'department_admin'])
            ->pluck('id');

        if ($permIds->isNotEmpty() && $managerRoleIds->isNotEmpty()) {
            DB::table('permission_role')
                ->whereIn('permission_id', $permIds)
                ->whereIn('role_id', $managerRoleIds)
                ->delete();
        }
    }

    public function down(): void
    {
        // Re-assigning would require recreating the exact previous state;
        // left empty since forward migration is corrective.
    }
};
