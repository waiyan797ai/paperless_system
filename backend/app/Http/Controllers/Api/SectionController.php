<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Section\StoreSectionRequest;
use App\Http\Requests\Section\UpdateSectionRequest;
use App\Models\Section;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    public function __construct(protected AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Section::with(['department', 'parent', 'head'])->withCount('users');

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"));
        }

        return response()->json(['data' => $query->paginate($request->integer('per_page', 15))]);
    }

    public function store(StoreSectionRequest $request): JsonResponse
    {
        $this->authorize('create', Section::class);
        $section = Section::create($request->validated());
        $this->auditService->log(AuditAction::Created, $section);

        return response()->json([
            'message' => 'Section created successfully.',
            'data' => $section->load(['department', 'head']),
        ], 201);
    }

    public function show(Section $section): JsonResponse
    {
        return response()->json([
            'data' => $section->load(['department', 'parent', 'head', 'children']),
        ]);
    }

    public function update(UpdateSectionRequest $request, Section $section): JsonResponse
    {
        $this->authorize('update', $section);
        $old = $section->toArray();
        $section->update($request->validated());
        $this->auditService->log(AuditAction::Updated, $section, null, $old, $section->toArray());

        return response()->json([
            'message' => 'Section updated successfully.',
            'data' => $section->fresh(['department', 'head']),
        ]);
    }

    public function destroy(Request $request, Section $section): JsonResponse
    {
        $this->authorize('delete', $section);

        if ($section->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete section with assigned users. Reassign or remove users first.',
            ], 422);
        }

        if ($section->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete section with child sections. Remove or reassign them first.',
            ], 422);
        }

        $this->auditService->log(AuditAction::Deleted, $section);
        $section->delete();

        return response()->json(['message' => 'Section deleted successfully.']);
    }
}
