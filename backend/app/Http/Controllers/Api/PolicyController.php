<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Policy\StorePolicyRequest;
use App\Http\Requests\Policy\UpdatePolicyRequest;
use App\Models\Policy;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PolicyController extends Controller
{
    public function __construct(protected AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Policy::with(['creator', 'policyType', 'createdDepartment']);

        if (! $request->user()->hasPermission('policies.manage')) {
            $query->where('status', 'active');
        }

        if ($request->filled('policy_type_id')) {
            $query->where('policy_type_id', $request->policy_type_id);
        }

        if ($request->filled('status') && $request->user()->hasPermission('policies.manage')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('policyType', fn ($typeQuery) => $typeQuery
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%"));
            });
        }

        return response()->json(['data' => $query->latest()->paginate($request->integer('per_page', 15))]);
    }

    public function store(StorePolicyRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;
        $data['created_department_id'] = $request->user()->department_id;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $data['file_path'] = $file->store('policies', 'documents');
            $data['file_name'] = $file->getClientOriginalName();
        }

        unset($data['file']);
        $policy = Policy::create($data);
        $this->auditService->log(AuditAction::Created, $policy);

        return response()->json([
            'message' => 'Policy created successfully.',
            'data' => $policy->load(['creator', 'policyType', 'createdDepartment']),
        ], 201);
    }

    public function show(Request $request, Policy $policy): JsonResponse
    {
        if (! $request->user()->hasPermission('policies.manage') && $policy->status !== 'active') {
            return response()->json(['message' => 'Policy not found.'], 404);
        }

        return response()->json(['data' => $policy->load(['creator', 'policyType', 'createdDepartment'])]);
    }

    public function update(UpdatePolicyRequest $request, Policy $policy): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('file')) {
            if ($policy->file_path) {
                Storage::disk('documents')->delete($policy->file_path);
            }
            $file = $request->file('file');
            $data['file_path'] = $file->store('policies', 'documents');
            $data['file_name'] = $file->getClientOriginalName();
        }

        unset($data['file']);
        $old = $policy->toArray();
        $policy->update($data);
        $this->auditService->log(AuditAction::Updated, $policy, null, $old, $policy->toArray());

        return response()->json([
            'message' => 'Policy updated successfully.',
            'data' => $policy->fresh(['creator', 'policyType', 'createdDepartment']),
        ]);
    }

    public function destroy(Request $request, Policy $policy): JsonResponse
    {
        if (! $request->user()->hasPermission('policies.manage')) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        if ($policy->file_path) {
            Storage::disk('documents')->delete($policy->file_path);
        }

        $this->auditService->log(AuditAction::Deleted, $policy);
        $policy->delete();

        return response()->json(['message' => 'Policy deleted successfully.']);
    }

    public function download(Request $request, Policy $policy): JsonResponse|\Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (! $request->user()->hasPermission('policies.manage') && $policy->status !== 'active') {
            return response()->json(['message' => 'Policy not found.'], 404);
        }

        if (! $policy->file_path || ! Storage::disk('documents')->exists($policy->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $this->auditService->log(AuditAction::Viewed, $policy);

        return Storage::disk('documents')->download($policy->file_path, $policy->file_name);
    }
}
