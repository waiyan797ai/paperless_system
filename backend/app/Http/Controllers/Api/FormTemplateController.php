<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\FormTemplate\StoreFormTemplateRequest;
use App\Http\Requests\FormTemplate\UpdateFormTemplateRequest;
use App\Models\FormTemplate;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FormTemplateController extends Controller
{
    public function __construct(protected AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('for_select')) {
            $query = FormTemplate::query()->orderBy('title');

            if (! $request->user()->isAdminLevel()) {
                $query->where('status', 'active');
            }

            return response()->json([
                'data' => $query->with(['targetDepartment:id,name,code', 'targetSection:id,name,code'])->get(),
            ]);
        }

        if (! $request->user()->isAdminLevel()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $query = FormTemplate::with(['targetDepartment', 'targetSection', 'creator'])->withCount('formRequests');

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

    public function store(StoreFormTemplateRequest $request): JsonResponse
    {
        $this->authorize('create', FormTemplate::class);
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;

        $template = FormTemplate::create($data);
        $this->auditService->log(AuditAction::Created, $template);

        return response()->json([
            'message' => 'Form template created successfully.',
            'data' => $template->load(['targetDepartment', 'targetSection', 'creator']),
        ], 201);
    }

    public function show(FormTemplate $formTemplate): JsonResponse
    {
        if (! request()->user()->isAdminLevel() && $formTemplate->status !== 'active') {
            return response()->json(['message' => 'Form template not found.'], 404);
        }

        return response()->json([
            'data' => $formTemplate->load(['targetDepartment', 'targetSection', 'creator']),
        ]);
    }

    public function update(UpdateFormTemplateRequest $request, FormTemplate $formTemplate): JsonResponse
    {
        $this->authorize('update', $formTemplate);
        $old = $formTemplate->toArray();
        $formTemplate->update($request->validated());
        $this->auditService->log(AuditAction::Updated, $formTemplate, null, $old, $formTemplate->toArray());

        return response()->json([
            'message' => 'Form template updated successfully.',
            'data' => $formTemplate->fresh(['targetDepartment', 'targetSection', 'creator']),
        ]);
    }

    public function destroy(FormTemplate $formTemplate): JsonResponse
    {
        $this->authorize('delete', $formTemplate);

        if ($formTemplate->formRequests()->exists()) {
            return response()->json([
                'message' => 'Cannot delete form template that is in use.',
            ], 422);
        }

        $this->auditService->log(AuditAction::Deleted, $formTemplate);
        $formTemplate->delete();

        return response()->json(['message' => 'Form template deleted successfully.']);
    }
}
