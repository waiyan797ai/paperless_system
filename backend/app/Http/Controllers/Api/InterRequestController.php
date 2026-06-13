<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Enums\InterRequestStatus;
use App\Enums\InterRequestStepAction;
use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Requests\InterRequest\ApproveInterRequestRequest;
use App\Http\Requests\InterRequest\ForwardInterRequestRequest;
use App\Http\Requests\InterRequest\StoreCommentRequest;
use App\Http\Requests\InterRequest\StoreInterRequestRequest;
use App\Http\Requests\InterRequest\UpdateInterRequestRequest;
use App\Models\InterRequest;
use App\Models\InterRequestAttachment;
use App\Models\InterRequestComment;
use App\Models\InterRequestStep;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
        $query = InterRequest::with(['requester', 'fromDepartment', 'toDepartment', 'assignee.department']);

        if (! $user->isAdminLevel()) {
            $query->where(function ($q) use ($user) {
                $q->where('requester_id', $user->id)
                    ->orWhere('assigned_to', $user->id)
                    ->orWhereHas('steps', function ($sq) use ($user) {
                        $sq->where('user_id', $user->id)->orWhere('assigned_to_id', $user->id);
                    });

                if ($user->isDepartmentHead()) {
                    $q->orWhere('from_department_id', $user->department_id)
                        ->orWhere('to_department_id', $user->department_id);
                }
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('scope')) {
            match ($request->scope) {
                'sent' => $query->where('requester_id', $user->id),
                'assigned' => $query->where('assigned_to', $user->id),
                'open' => $query->whereIn('status', [
                    InterRequestStatus::Pending->value,
                    InterRequestStatus::Processing->value,
                ]),
                'closed' => $query->whereIn('status', [
                    InterRequestStatus::Approved->value,
                    InterRequestStatus::Rejected->value,
                    InterRequestStatus::Completed->value,
                ]),
                default => null,
            };
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('subject', 'ilike', "%{$search}%")
                ->orWhere('reference_no', 'ilike', "%{$search}%")
                ->orWhereHas('requester', fn ($rq) => $rq->where('name', 'ilike', "%{$search}%"))
                ->orWhereHas('assignee', fn ($aq) => $aq->where('name', 'ilike', "%{$search}%")));
        }

        return response()->json(['data' => $query->latest()->paginate($request->integer('per_page', 15))]);
    }

    public function store(StoreInterRequestRequest $request): JsonResponse
    {
        $requester = $request->user();
        $assignee = User::where('id', $request->assigned_to)
            ->where('status', 'active')
            ->where('id', '!=', $requester->id)
            ->first();
        if (! $assignee) {
            return response()->json(['message' => 'Selected user is not available.'], 422);
        }

        $interRequest = DB::transaction(function () use ($request, $requester, $assignee) {
            $interRequest = InterRequest::create([
                'reference_no' => 'IM-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'requester_id' => $requester->id,
                'from_department_id' => $requester->department_id,
                'to_department_id' => $assignee->department_id,
                'assigned_to' => $assignee->id,
                'subject' => $request->subject,
                'description' => $request->description,
                'priority' => $request->priority ?? 'normal',
                'status' => InterRequestStatus::Pending,
            ]);

            InterRequestStep::create([
                'inter_request_id' => $interRequest->id,
                'user_id' => $request->user()->id,
                'assigned_to_id' => $assignee->id,
                'action' => InterRequestStepAction::Submitted,
                'remark' => $request->remark,
            ]);

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    InterRequestAttachment::create([
                        'inter_request_id' => $interRequest->id,
                        'uploaded_by' => $request->user()->id,
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $file->store('inter-memos', 'documents'),
                        'mime_type' => $file->getMimeType(),
                        'file_size' => $file->getSize(),
                    ]);
                }
            }

            return $interRequest;
        });

        $this->notificationService->create(
            $assignee,
            NotificationType::InterRequest,
            'Inter-Department Memo Assigned',
            "{$request->user()->name} sent you a memo: {$interRequest->subject}",
            ['inter_request_id' => $interRequest->id]
        );

        $this->auditService->log(AuditAction::Created, $interRequest);

        return response()->json([
            'message' => 'Inter-department memo created.',
            'data' => $interRequest->load(['requester', 'fromDepartment', 'toDepartment', 'assignee.department', 'attachments', 'steps.user', 'steps.assignee']),
        ], 201);
    }

    public function show(InterRequest $interRequest): JsonResponse
    {
        $this->authorize('view', $interRequest);

        return response()->json([
            'data' => $interRequest->load([
                'requester', 'fromDepartment', 'toDepartment', 'assignee.department',
                'comments.user', 'attachments.uploader',
                'steps.user', 'steps.assignee',
            ]),
        ]);
    }

    public function assignableUsers(Request $request, ?InterRequest $interRequest = null): JsonResponse
    {
        $excludeIds = array_filter([$request->user()->id, $interRequest?->requester_id]);

        $query = User::query()
            ->with(['department', 'section'])
            ->where('status', 'active')
            ->whereNotIn('id', $excludeIds)
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('name', 'ilike', "%{$search}%")
                ->orWhere('email', 'ilike', "%{$search}%"));
        }

        return response()->json(['data' => $query->get(['id', 'name', 'email', 'department_id', 'section_id'])]);
    }

    public function forward(ForwardInterRequestRequest $request, InterRequest $interRequest): JsonResponse
    {
        if (! $interRequest->isOpen()) {
            return response()->json(['message' => 'This memo is already closed.'], 422);
        }

        $assignee = User::where('id', $request->assigned_to)
            ->where('status', 'active')
            ->where('id', '!=', $request->user()->id)
            ->first();
        if (! $assignee) {
            return response()->json(['message' => 'Selected user is not available.'], 422);
        }

        DB::transaction(function () use ($request, $interRequest, $assignee) {
            InterRequestStep::create([
                'inter_request_id' => $interRequest->id,
                'user_id' => $request->user()->id,
                'assigned_to_id' => $assignee->id,
                'action' => InterRequestStepAction::Forwarded,
                'remark' => $request->remark,
            ]);

            $interRequest->update([
                'assigned_to' => $assignee->id,
                'to_department_id' => $assignee->department_id,
                'status' => InterRequestStatus::Processing,
            ]);
        });

        $this->notificationService->create(
            $assignee,
            NotificationType::InterRequest,
            'Inter-Memo Forwarded to You',
            "{$request->user()->name} forwarded a memo: {$interRequest->subject}",
            ['inter_request_id' => $interRequest->id]
        );

        $this->auditService->log(AuditAction::Updated, $interRequest);

        return response()->json([
            'message' => 'Memo forwarded successfully.',
            'data' => $interRequest->fresh(['requester', 'fromDepartment', 'toDepartment', 'assignee.department', 'steps.user', 'steps.assignee']),
        ]);
    }

    public function approve(ApproveInterRequestRequest $request, InterRequest $interRequest): JsonResponse
    {
        if (! $interRequest->isOpen()) {
            return response()->json(['message' => 'This memo is already closed.'], 422);
        }

        DB::transaction(function () use ($request, $interRequest) {
            InterRequestStep::create([
                'inter_request_id' => $interRequest->id,
                'user_id' => $request->user()->id,
                'assigned_to_id' => null,
                'action' => InterRequestStepAction::Approved,
                'remark' => $request->remark,
            ]);

            $interRequest->update([
                'status' => InterRequestStatus::Approved,
                'completed_at' => now(),
            ]);
        });

        $this->notificationService->create(
            $interRequest->requester,
            NotificationType::InterRequest,
            'Inter-Memo Approved',
            "{$request->user()->name} approved your memo: {$interRequest->subject}",
            ['inter_request_id' => $interRequest->id]
        );

        $this->auditService->log(AuditAction::Updated, $interRequest);

        return response()->json([
            'message' => 'Memo approved successfully.',
            'data' => $interRequest->fresh(['requester', 'fromDepartment', 'toDepartment', 'assignee.department', 'steps.user', 'steps.assignee']),
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
            'message' => 'Inter-department memo updated.',
            'data' => $interRequest->fresh(['requester', 'fromDepartment', 'toDepartment']),
        ]);
    }

    public function destroy(InterRequest $interRequest): JsonResponse
    {
        $this->authorize('delete', $interRequest);
        $this->auditService->log(AuditAction::Deleted, $interRequest);
        $interRequest->delete();

        return response()->json(['message' => 'Inter-department memo deleted.']);
    }

    public function addComment(StoreCommentRequest $request, InterRequest $interRequest): JsonResponse
    {
        $comment = InterRequestComment::create([
            'inter_request_id' => $interRequest->id,
            'user_id' => $request->user()->id,
            'comment' => $request->comment,
        ]);

        $this->auditService->log(AuditAction::Updated, $interRequest, $request->user(), null, ['action' => 'comment_added', 'comment_id' => $comment->id]);

        return response()->json([
            'message' => 'Comment added.',
            'data' => $comment->load('user'),
        ], 201);
    }

    public function addAttachment(Request $request, InterRequest $interRequest): JsonResponse
    {
        $this->authorize('update', $interRequest);

        $request->validate(['file' => ['required', 'file', 'max:30720']]);

        $file = $request->file('file');
        $attachment = InterRequestAttachment::create([
            'inter_request_id' => $interRequest->id,
            'uploaded_by' => $request->user()->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $file->store('inter-memos', 'documents'),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);

        $this->auditService->log(AuditAction::Updated, $interRequest, $request->user(), null, ['action' => 'attachment_added', 'attachment_id' => $attachment->id]);

        return response()->json([
            'message' => 'Attachment uploaded.',
            'data' => $attachment,
        ], 201);
    }

    public function downloadAttachment(InterRequest $interRequest, InterRequestAttachment $attachment): JsonResponse|\Symfony\Component\HttpFoundation\StreamedResponse
    {
        $this->authorize('view', $interRequest);

        if ($attachment->inter_request_id !== $interRequest->id) {
            abort(404);
        }

        if (! Storage::disk('documents')->exists($attachment->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        return Storage::disk('documents')->download($attachment->file_path, $attachment->file_name);
    }
}
