<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasPermission('roles.manage') && ! $request->user()->isAdminLevel()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json([
            'data' => [
                'permissions' => Permission::orderBy('group')->orderBy('name')->get(),
                'roles' => Role::with('permissions')->orderBy('display_name')->get(),
            ],
        ]);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        if (! $request->user()->hasPermission('roles.manage') && ! $request->user()->isAdminLevel()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (in_array($role->name, ['super_admin', 'admin'], true)) {
            return response()->json(['message' => 'Admin role permissions cannot be modified.'], 422);
        }

        $request->validate([
            'permission_ids' => ['required', 'array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ]);

        $role->permissions()->sync($request->permission_ids);

        return response()->json([
            'message' => 'Role permissions updated successfully.',
            'data' => $role->load('permissions'),
        ]);
    }
}
