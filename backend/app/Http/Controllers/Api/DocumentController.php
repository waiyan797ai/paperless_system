<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Enums\DocumentRecipientStatus;
use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Document\DistributeDocumentRequest;
use App\Http\Requests\Document\ForwardDocumentRequest;
use App\Http\Requests\Document\StoreAndDistributeDocumentRequest;
use App\Http\Requests\Document\StoreDocumentRequest;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentDepartmentRecipient;
use App\Models\DocumentDistribution;
use App\Models\DocumentType;
use App\Models\DocumentUserForward;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Services\RealtimeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
        protected NotificationService $notificationService,
        protected RealtimeService $realtimeService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Document::with([
            'uploader.department',
            'documentType',
            'distributions.recipients.department',
            'userForwards.user',
        ]);

        $direction = $request->input('direction', 'incoming');

        if ($direction === 'outgoing') {
            $query->where('uploaded_by', $user->id);
        } elseif (! $user->isAdminLevel()) {
            $query->where('uploaded_by', '!=', $user->id)
                ->where(function ($q) use ($user) {
                    if ($user->isDepartmentAdmin()) {
                        $q->whereHas(
                            'distributions.recipients',
                            fn ($rq) => $rq->where('department_id', $user->department_id)
                        );
                    }

                    $q->orWhereHas('userForwards', fn ($fq) => $fq->where('user_id', $user->id));
                });
        }

        if ($request->filled('document_type_id')) {
            $query->where('document_type_id', $request->document_type_id);
        } elseif ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('department_id')) {
            $departmentId = (int) $request->department_id;
            $query->where(function ($q) use ($departmentId, $direction) {
                $q->whereHas(
                    'distributions.recipients',
                    fn ($rq) => $rq->where('department_id', $departmentId)
                );

                if ($direction !== 'outgoing') {
                    $q->orWhereHas(
                        'uploader',
                        fn ($uq) => $uq->where('department_id', $departmentId)
                    );
                }
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('updated_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('updated_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('title', 'ilike', "%{$search}%")
                ->orWhere('description', 'ilike', "%{$search}%")
                ->orWhere('file_name', 'ilike', "%{$search}%")
                ->orWhereHas('uploader', fn ($uq) => $uq->where('name', 'ilike', "%{$search}%")));
        }

        return response()->json(['data' => $query->latest()->paginate($request->integer('per_page', 15))]);
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $this->authorize('create', Document::class);
        $file = $request->file('file');
        $typeFields = $this->resolveDocumentTypeFields($request->document_type_id);

        $document = Document::create([
            'title' => $request->title,
            'description' => $request->description,
            ...$typeFields,
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
            'data' => $document->load([
                'uploader',
                'documentType',
                'distributions.recipients.department',
                'userForwards.user',
                'userForwards.forwarder',
            ]),
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

    public function storeAndDistribute(StoreAndDistributeDocumentRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $user = $request->user();

        $typeFields = $this->resolveDocumentTypeFields($request->document_type_id);

        $document = DB::transaction(function () use ($request, $file, $user, $typeFields) {
            $document = Document::create([
                'title' => $request->title,
                'description' => $request->description,
                ...$typeFields,
                'version' => $request->version ?? '1.0',
                'uploaded_by' => $user->id,
                'file_path' => $file->store('documents', 'documents'),
                'file_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);

            $distribution = $this->createDistribution(
                $document,
                $user->id,
                $request->department_ids,
                $request->notes
            );

            $this->auditService->log(AuditAction::Created, $document);
            $this->auditService->log(AuditAction::Distributed, $document);

            return $document;
        });

        $this->realtimeService->bumpForDocumentDistribution(
            $document,
            $request->department_ids,
            $user->id,
        );

        return response()->json([
            'message' => 'Document distributed successfully.',
            'data' => $document->load(['uploader.department', 'distributions.recipients.department']),
        ], 201);
    }

    public function distributionHistory(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = DocumentDistribution::with(['document.documentType', 'distributor.department', 'recipients.department']);

        if (! $user->isAdminLevel()) {
            $query->where('distributed_by', $user->id);
        }

        return response()->json([
            'data' => $query->latest('distributed_at')->paginate($request->integer('per_page', 10)),
        ]);
    }

    public function forwardableUsers(Request $request, Document $document): JsonResponse
    {
        $this->authorize('forward', $document);

        $user = $request->user();
        $departmentId = $user->department_id;

        $alreadyForwarded = $document->userForwards()
            ->where('department_id', $departmentId)
            ->pluck('user_id');

        $users = User::query()
            ->with('section')
            ->where('department_id', $departmentId)
            ->where('status', 'active')
            ->where('id', '!=', $user->id)
            ->whereNotIn('id', $alreadyForwarded)
            ->where(function ($q) use ($departmentId) {
                $q->whereDoesntHave('role', fn ($rq) => $rq->whereIn('name', ['manager', 'admin', 'super_admin']))
                    ->whereNotIn('id', Department::where('id', $departmentId)->whereNotNull('head_id')->pluck('head_id'));
            })
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'section_id']);

        return response()->json(['data' => $users]);
    }

    public function forward(ForwardDocumentRequest $request, Document $document): JsonResponse
    {
        $user = $request->user();
        $departmentId = $user->department_id;

        $validUsers = User::query()
            ->where('department_id', $departmentId)
            ->where('status', 'active')
            ->whereIn('id', $request->user_ids)
            ->where('id', '!=', $user->id)
            ->get();

        if ($validUsers->isEmpty()) {
            return response()->json(['message' => 'No valid users selected for forwarding.'], 422);
        }

        $createdForwards = collect();

        DB::transaction(function () use ($document, $user, $departmentId, $request, $validUsers, &$createdForwards) {
            foreach ($validUsers as $recipient) {
                $forward = DocumentUserForward::firstOrCreate(
                    [
                        'document_id' => $document->id,
                        'department_id' => $departmentId,
                        'user_id' => $recipient->id,
                    ],
                    [
                        'forwarded_by' => $user->id,
                        'status' => DocumentRecipientStatus::Sent,
                        'notes' => $request->notes,
                    ]
                );

                if ($forward->wasRecentlyCreated) {
                    $createdForwards->push($forward);
                }
            }
        });

        if ($createdForwards->isNotEmpty()) {
            $this->notificationService->notifyMany(
                $validUsers->whereIn('id', $createdForwards->pluck('user_id')),
                NotificationType::Document,
                'Document Forwarded to You',
                "Document \"{$document->title}\" has been forwarded to you by your department admin.",
                ['document_id' => $document->id]
            );

            $this->realtimeService->bumpForDocumentForward(
                $document,
                $createdForwards->pluck('user_id')->all(),
                $user->id,
            );
        }

        return response()->json([
            'message' => $createdForwards->isEmpty()
                ? 'Selected users already have access to this document.'
                : 'Document forwarded successfully.',
            'data' => $document->load(['userForwards.user', 'userForwards.forwarder']),
        ]);
    }

    public function distribute(DistributeDocumentRequest $request, Document $document): JsonResponse
    {
        $distribution = $this->createDistribution(
            $document,
            $request->user()->id,
            $request->department_ids,
            $request->notes
        );

        $this->auditService->log(AuditAction::Distributed, $document);

        $this->realtimeService->bumpForDocumentDistribution(
            $document,
            $request->department_ids,
            $request->user()->id,
        );

        return response()->json([
            'message' => 'Document distributed successfully.',
            'data' => $distribution->load('recipients.department'),
        ], 201);
    }

    protected function createDistribution(
        Document $document,
        int $distributedBy,
        array $departmentIds,
        ?string $notes = null,
    ): DocumentDistribution {
        $distribution = DocumentDistribution::create([
            'document_id' => $document->id,
            'distributed_by' => $distributedBy,
            'notes' => $notes,
            'distributed_at' => now(),
        ]);

        foreach ($departmentIds as $departmentId) {
            DocumentDepartmentRecipient::create([
                'document_distribution_id' => $distribution->id,
                'department_id' => $departmentId,
                'status' => DocumentRecipientStatus::Sent,
            ]);

            $this->distributeToAllDepartmentUsers($document, $departmentId, $distributedBy, $notes);

            // Previous head-first flow — notify dept head/admin only; staff waited for manual forward:
            // $admins = $this->departmentAdminUsers($departmentId);
            // $this->notificationService->notifyMany(
            //     $admins,
            //     NotificationType::Document,
            //     'New Document for Your Department',
            //     "Document \"{$document->title}\" has been sent to your department. Forward it to staff who need access.",
            //     ['document_id' => $document->id, 'distribution_id' => $distribution->id]
            // );
        }

        return $distribution;
    }

    protected function distributeToAllDepartmentUsers(
        Document $document,
        int $departmentId,
        int $distributedBy,
        ?string $notes = null,
    ): void {
        $users = User::query()
            ->where('department_id', $departmentId)
            ->where('status', 'active')
            ->where('id', '!=', $distributedBy)
            ->get();

        foreach ($users as $recipient) {
            DocumentUserForward::firstOrCreate(
                [
                    'document_id' => $document->id,
                    'department_id' => $departmentId,
                    'user_id' => $recipient->id,
                ],
                [
                    'forwarded_by' => $distributedBy,
                    'status' => DocumentRecipientStatus::Sent,
                    'notes' => $notes,
                ]
            );
        }

        if ($users->isNotEmpty()) {
            $this->notificationService->notifyMany(
                $users,
                NotificationType::Document,
                'New Document for Your Department',
                "Document \"{$document->title}\" has been sent to your department.",
                ['document_id' => $document->id]
            );
        }
    }

    public function markViewed(Request $request, Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        $user = $request->user();

        if ($user->isDepartmentAdmin()) {
            $recipient = DocumentDepartmentRecipient::whereHas('distribution', fn ($q) => $q->where('document_id', $document->id))
                ->where('department_id', $user->department_id)
                ->first();

            if ($recipient && $recipient->status === DocumentRecipientStatus::Sent) {
                $recipient->update([
                    'status' => DocumentRecipientStatus::Viewed,
                    'viewed_at' => now(),
                ]);
            }
        }

        $forward = DocumentUserForward::where('document_id', $document->id)
            ->where('user_id', $user->id)
            ->first();

        if ($forward && $forward->status === DocumentRecipientStatus::Sent) {
            $forward->update([
                'status' => DocumentRecipientStatus::Viewed,
                'viewed_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Document marked as viewed.']);
    }

    public function acknowledge(Request $request, Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        $user = $request->user();

        if ($user->isDepartmentAdmin()) {
            $recipient = DocumentDepartmentRecipient::whereHas('distribution', fn ($q) => $q->where('document_id', $document->id))
                ->where('department_id', $user->department_id)
                ->first();

            if ($recipient) {
                $recipient->update([
                    'status' => DocumentRecipientStatus::Acknowledged,
                    'acknowledged_at' => now(),
                    'viewed_at' => $recipient->viewed_at ?? now(),
                ]);
            }
        }

        $forward = DocumentUserForward::where('document_id', $document->id)
            ->where('user_id', $user->id)
            ->first();

        if ($forward) {
            $forward->update([
                'status' => DocumentRecipientStatus::Acknowledged,
                'viewed_at' => $forward->viewed_at ?? now(),
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

        $forwards = $document->userForwards()
            ->with(['user', 'forwarder', 'department'])
            ->latest()
            ->get();

        return response()->json(['data' => ['distributions' => $distributions, 'forwards' => $forwards]]);
    }

    protected function resolveDocumentTypeFields(?int $documentTypeId): array
    {
        $type = DocumentType::query()
            ->where('id', $documentTypeId)
            ->where('status', 'active')
            ->firstOrFail();

        return [
            'document_type_id' => $type->id,
            'category' => $type->title,
        ];
    }

    protected function departmentAdminUsers(int $departmentId)
    {
        $headIds = Department::where('id', $departmentId)->whereNotNull('head_id')->pluck('head_id');

        return User::query()
            ->where('department_id', $departmentId)
            ->where('status', 'active')
            ->where(function ($q) use ($headIds) {
                $q->whereHas('role', fn ($rq) => $rq->whereIn('name', ['manager']))
                    ->orWhereIn('id', $headIds);
            })
            ->get();
    }
}
