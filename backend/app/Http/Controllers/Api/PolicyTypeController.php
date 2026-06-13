<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\PolicyType\StorePolicyTypeRequest;
use App\Http\Requests\PolicyType\UpdatePolicyTypeRequest;
use App\Models\PolicyType;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PolicyTypeController extends Controller
{
    public function __construct(protected AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('for_select')) {
            $query = PolicyType::query()->orderBy('title');

            if (! $request->user()->isAdminLevel()) {
                $query->where('status', 'active');
            }

            return response()->json([
                'data' => $query->get(['id', 'code', 'title']),
            ]);
        }

        if (! $request->user()->isAdminLevel()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $query = PolicyType::query()->withCount('policies');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('code', 'like', "%{$search}%")
                ->orWhere('title', 'like', "%{$search}%"));
        }

        return response()->json(['data' => $query->latest()->paginate($request->integer('per_page', 15))]);
    }

    public function store(StorePolicyTypeRequest $request): JsonResponse
    {
        $this->authorize('create', PolicyType::class);
        $policyType = PolicyType::create($request->validated());
        $this->auditService->log(AuditAction::Created, $policyType);

        return response()->json([
            'message' => 'Policy type created successfully.',
            'data' => $policyType,
        ], 201);
    }

    public function show(PolicyType $policyType): JsonResponse
    {
        if (! request()->user()->isAdminLevel()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(['data' => $policyType->loadCount('policies')]);
    }

    public function update(UpdatePolicyTypeRequest $request, PolicyType $policyType): JsonResponse
    {
        $this->authorize('update', $policyType);
        $old = $policyType->toArray();
        $policyType->update($request->validated());
        $this->auditService->log(AuditAction::Updated, $policyType, null, $old, $policyType->toArray());

        return response()->json([
            'message' => 'Policy type updated successfully.',
            'data' => $policyType->fresh(),
        ]);
    }

    public function destroy(PolicyType $policyType): JsonResponse
    {
        $this->authorize('delete', $policyType);

        if ($policyType->policies()->exists()) {
            return response()->json([
                'message' => 'Cannot delete policy type that is in use by policies.',
            ], 422);
        }

        $this->auditService->log(AuditAction::Deleted, $policyType);
        $policyType->delete();

        return response()->json(['message' => 'Policy type deleted successfully.']);
    }
}
