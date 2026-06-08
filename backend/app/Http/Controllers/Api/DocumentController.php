<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Enums\DocumentRecipientStatus;
use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Document\DistributeDocumentRequest;
use App\Http\Requests\Document\StoreDocumentRequest;
use App\Models\Document;
use App\Models\DocumentDepartmentRecipient;
use App\Models\DocumentDistribution;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
        protected NotificationService $notificationService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Document::with('uploader');

        if (! $user->isAdminLevel()) {
            $query->where(function ($q) use ($user) {
                $q->where('uploaded_by', $user->id)
                    ->orWhereHas('distributions.recipients', fn ($rq) => $rq->where('department_id', $user->department_id));
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('title', 'ilike', "%{$search}%")
                ->orWhere('description', 'ilike', "%{$search}%"));
        }

        return response()->json(['data' => $query->latest()->paginate($request->integer('per_page', 15))]);
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $file = $request->file('file');

        $document = Document::create([
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
            'version' => $request->version ?? '1.0',
            'uploaded_by' => $request->user()->id,
            'file_path' => $file->store('documents', 'documents'),
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);

        $this->auditService->log(AuditAction::Created, $document);

        return response()->json([
            'message' => 'Document uploaded successfully.',
            'data' => $document->load('uploader'),
        ], 201);
    }

    public function show(Document $document): JsonResponse
    {
        $this->authorize('view', $document);
        $this->auditService->log(AuditAction::Viewed, $document);

        return response()->json([
            'data' => $document->load(['uploader', 'distributions.recipients.department']),
        ]);
    }

    public function destroy(Document $document): JsonResponse
    {
        $this->authorize('delete', $document);

        if (Storage::disk('documents')->exists($document->file_path)) {
            Storage::disk('documents')->delete($document->file_path);
        }

        $this->auditService->log(AuditAction::Deleted, $document);
        $document->delete();

        return response()->json(['message' => 'Document deleted successfully.']);
    }

    public function distribute(DistributeDocumentRequest $request, Document $document): JsonResponse
    {
        $distribution = DocumentDistribution::create([
            'document_id' => $document->id,
            'distributed_by' => $request->user()->id,
            'notes' => $request->notes,
            'distributed_at' => now(),
        ]);

        foreach ($request->department_ids as $departmentId) {
            DocumentDepartmentRecipient::create([
                'document_distribution_id' => $distribution->id,
                'department_id' => $departmentId,
                'status' => DocumentRecipientStatus::Sent,
            ]);

            $users = User::where('department_id', $departmentId)->where('status', 'active')->get();
            $this->notificationService->notifyMany(
                $users,
                NotificationType::Document,
                'New Document Distributed',
                "Document \"{$document->title}\" has been distributed to your department.",
                ['document_id' => $document->id, 'distribution_id' => $distribution->id]
            );
        }

        $this->auditService->log(AuditAction::Distributed, $document);

        return response()->json([
            'message' => 'Document distributed successfully.',
            'data' => $distribution->load('recipients.department'),
        ], 201);
    }

    public function markViewed(Request $request, Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        $recipient = DocumentDepartmentRecipient::whereHas('distribution', fn ($q) => $q->where('document_id', $document->id))
            ->where('department_id', $request->user()->department_id)
            ->first();

        if ($recipient && $recipient->status === DocumentRecipientStatus::Sent) {
            $recipient->update([
                'status' => DocumentRecipientStatus::Viewed,
                'viewed_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Document marked as viewed.']);
    }

    public function acknowledge(Request $request, Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        $recipient = DocumentDepartmentRecipient::whereHas('distribution', fn ($q) => $q->where('document_id', $document->id))
            ->where('department_id', $request->user()->department_id)
            ->first();

        if ($recipient) {
            $recipient->update([
                'status' => DocumentRecipientStatus::Acknowledged,
                'acknowledged_at' => now(),
                'viewed_at' => $recipient->viewed_at ?? now(),
            ]);
        }

        return response()->json(['message' => 'Document acknowledged.']);
    }

    public function download(Document $document): JsonResponse|\Symfony\Component\HttpFoundation\StreamedResponse
    {
        $this->authorize('view', $document);

        if (! Storage::disk('documents')->exists($document->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $this->auditService->log(AuditAction::Viewed, $document);

        return Storage::disk('documents')->download($document->file_path, $document->file_name);
    }

    public function tracking(Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        $distributions = $document->distributions()
            ->with(['recipients.department', 'distributor'])
            ->latest('distributed_at')
            ->get();

        return response()->json(['data' => $distributions]);
    }
}
