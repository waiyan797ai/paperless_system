<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Enums\InterRequestStatus;
use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\InterRequest\StoreCommentRequest;
use App\Http\Requests\InterRequest\StoreInterRequestRequest;
use App\Http\Requests\InterRequest\UpdateInterRequestRequest;
use App\Models\InterRequest;
use App\Models\InterRequestAttachment;
use App\Models\InterRequestComment;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InterRequestController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
        protected NotificationService $notificationService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = InterRequest::with(['requester', 'fromDepartment', 'toDepartment', 'assignee']);

        if ($user->isAdminLevel()) {
            // all
        } elseif ($user->isDepartmentHead()) {
            $query->where(function ($q) use ($user) {
                $q->where('requester_id', $user->id)
                    ->orWhere('from_department_id', $user->department_id)
                    ->orWhere('to_department_id', $user->department_id);
            });
        } else {
            $query->where('requester_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(['data' => $query->latest()->paginate($request->integer('per_page', 15))]);
    }

    public function store(StoreInterRequestRequest $request): JsonResponse
    {
        $interRequest = InterRequest::create([
            'reference_no' => 'IR-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
            'requester_id' => $request->user()->id,
            'from_department_id' => $request->from_department_id,
            'to_department_id' => $request->to_department_id,
            'subject' => $request->subject,
            'description' => $request->description,
            'priority' => $request->priority ?? 'normal',
            'status' => InterRequestStatus::Pending,
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                InterRequestAttachment::create([
                    'inter_request_id' => $interRequest->id,
                    'uploaded_by' => $request->user()->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $file->store('inter-requests', 'documents'),
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        if ($interRequest->toDepartment?->head) {
            $this->notificationService->create(
                $interRequest->toDepartment->head,
                NotificationType::InterRequest,
                'New Inter-Department Request',
                "New request: {$interRequest->subject}",
                ['inter_request_id' => $interRequest->id]
            );
        }

        $this->auditService->log(AuditAction::Created, $interRequest);

        return response()->json([
            'message' => 'Inter-department request created.',
            'data' => $interRequest->load(['requester', 'fromDepartment', 'toDepartment', 'attachments']),
        ], 201);
    }

    public function show(InterRequest $interRequest): JsonResponse
    {
        $this->authorize('view', $interRequest);

        return response()->json([
            'data' => $interRequest->load([
                'requester', 'fromDepartment', 'toDepartment', 'assignee',
                'comments.user', 'attachments.uploader',
            ]),
        ]);
    }

    public function update(UpdateInterRequestRequest $request, InterRequest $interRequest): JsonResponse
    {
        $old = $interRequest->toArray();
        $interRequest->update($request->validated());

        if ($request->status === InterRequestStatus::Completed->value) {
            $interRequest->update(['completed_at' => now()]);
        }

        $this->auditService->log(AuditAction::Updated, $interRequest, null, $old, $interRequest->toArray());

        return response()->json([
            'message' => 'Inter-department request updated.',
            'data' => $interRequest->fresh(['requester', 'fromDepartment', 'toDepartment']),
        ]);
    }

    public function destroy(InterRequest $interRequest): JsonResponse
    {
        $this->authorize('delete', $interRequest);
        $this->auditService->log(AuditAction::Deleted, $interRequest);
        $interRequest->delete();

        return response()->json(['message' => 'Inter-department request deleted.']);
    }

    public function addComment(StoreCommentRequest $request, InterRequest $interRequest): JsonResponse
    {
        $comment = InterRequestComment::create([
            'inter_request_id' => $interRequest->id,
            'user_id' => $request->user()->id,
            'comment' => $request->comment,
        ]);

        return response()->json([
            'message' => 'Comment added.',
            'data' => $comment->load('user'),
        ], 201);
    }

    public function addAttachment(Request $request, InterRequest $interRequest): JsonResponse
    {
        $this->authorize('update', $interRequest);

        $request->validate(['file' => ['required', 'file', 'max:10240']]);

        $file = $request->file('file');
        $attachment = InterRequestAttachment::create([
            'inter_request_id' => $interRequest->id,
            'uploaded_by' => $request->user()->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $file->store('inter-requests', 'documents'),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);

        return response()->json([
            'message' => 'Attachment uploaded.',
            'data' => $attachment,
        ], 201);
    }
}
