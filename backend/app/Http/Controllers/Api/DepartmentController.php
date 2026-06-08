<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Department\StoreDepartmentRequest;
use App\Http\Requests\Department\UpdateDepartmentRequest;
use App\Models\Department;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function __construct(protected AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Department::class);

        $query = Department::with(['parent', 'head', 'children'])->withCount(['users', 'sections']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"));
        }

        if ($request->boolean('tree')) {
            $departments = $query->whereNull('parent_id')->get();

            return response()->json(['data' => $departments]);
        }

        return response()->json(['data' => $query->paginate($request->integer('per_page', 15))]);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $department = Department::create($request->validated());
        $this->auditService->log(AuditAction::Created, $department);

        return response()->json([
            'message' => 'Department created successfully.',
            'data' => $department->load(['parent', 'head']),
        ], 201);
    }

    public function show(Department $department): JsonResponse
    {
        $this->authorize('view', $department);

        return response()->json([
            'data' => $department->load(['parent', 'head', 'children', 'sections']),
        ]);
    }

    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $old = $department->toArray();
        $department->update($request->validated());
        $this->auditService->log(AuditAction::Updated, $department, null, $old, $department->toArray());

        return response()->json([
            'message' => 'Department updated successfully.',
            'data' => $department->fresh(['parent', 'head']),
        ]);
    }

    public function destroy(Department $department): JsonResponse
    {
        $this->authorize('delete', $department);

        if ($department->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete department with assigned users. Reassign or remove users first.',
            ], 422);
        }

        if ($department->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete department with child departments. Remove or reassign them first.',
            ], 422);
        }

        $this->auditService->log(AuditAction::Deleted, $department);
        $department->delete();

        return response()->json(['message' => 'Department deleted successfully.']);
    }
}
