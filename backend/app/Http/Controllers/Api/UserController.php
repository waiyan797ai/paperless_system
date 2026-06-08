<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(protected AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $query = User::with(['role', 'department', 'section', 'approver']);

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('employee_id', 'like', "%{$search}%"));
        }

        if (! $request->user()->isAdminLevel()) {
            $query->where('department_id', $request->user()->department_id);
        }

        return response()->json(['data' => $query->paginate($request->integer('per_page', 15))]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->validated());
        $this->auditService->log(AuditAction::Created, $user);

        return response()->json([
            'message' => 'User created successfully.',
            'data' => $user->load(['role', 'department', 'section']),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return response()->json([
            'data' => $user->load(['role', 'department', 'section', 'approver']),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $old = $user->toArray();
        $user->update($request->validated());
        $this->auditService->log(AuditAction::Updated, $user, null, $old, $user->toArray());

        return response()->json([
            'message' => 'User updated successfully.',
            'data' => $user->fresh(['role', 'department', 'section']),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $this->auditService->log(AuditAction::Deleted, $user);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully.']);
    }
}
