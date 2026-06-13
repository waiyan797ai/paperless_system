<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\DocumentType\StoreDocumentTypeRequest;
use App\Http\Requests\DocumentType\UpdateDocumentTypeRequest;
use App\Models\DocumentType;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentTypeController extends Controller
{
    public function __construct(protected AuditService $auditService) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('for_select')) {
            $query = DocumentType::query()->orderBy('title');

            if (! $request->user()->isAdminLevel() && ! $request->user()->isDepartmentAdmin()) {
                $query->where('status', 'active');
            } else {
                $query->where('status', 'active');
            }

            return response()->json([
                'data' => $query->get(['id', 'code', 'title']),
            ]);
        }

        if (! $request->user()->isAdminLevel() && ! $request->user()->isDepartmentAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $query = DocumentType::query()->withCount('documents');

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

    public function store(StoreDocumentTypeRequest $request): JsonResponse
    {
        $this->authorize('create', DocumentType::class);
        $documentType = DocumentType::create($request->validated());
        $this->auditService->log(AuditAction::Created, $documentType);

        return response()->json([
            'message' => 'Document type created successfully.',
            'data' => $documentType,
        ], 201);
    }

    public function show(DocumentType $documentType): JsonResponse
    {
        if (! request()->user()->isAdminLevel() && ! request()->user()->isDepartmentAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(['data' => $documentType->loadCount('documents')]);
    }

    public function update(UpdateDocumentTypeRequest $request, DocumentType $documentType): JsonResponse
    {
        $this->authorize('update', $documentType);
        $old = $documentType->toArray();
        $documentType->update($request->validated());
        $this->auditService->log(AuditAction::Updated, $documentType, null, $old, $documentType->toArray());

        return response()->json([
            'message' => 'Document type updated successfully.',
            'data' => $documentType->fresh(),
        ]);
    }

    public function destroy(DocumentType $documentType): JsonResponse
    {
        $this->authorize('delete', $documentType);

        if ($documentType->documents()->exists()) {
            return response()->json([
                'message' => 'Cannot delete document type that is in use by documents.',
            ], 422);
        }

        $this->auditService->log(AuditAction::Deleted, $documentType);
        $documentType->delete();

        return response()->json(['message' => 'Document type deleted successfully.']);
    }
}
