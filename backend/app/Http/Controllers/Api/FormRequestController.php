<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Enums\RequestStatus;
use App\Enums\RequestType;
use App\Http\Controllers\Controller;
use App\Http\Requests\FormRequest\ApprovalActionRequest;
use App\Http\Requests\FormRequest\ForwardSectionRequest;
use App\Http\Requests\FormRequest\RejectFormRequestRequest;
use App\Http\Requests\FormRequest\ReturnFormRequestRequest;
use App\Http\Requests\FormRequest\StoreCommentRequest;
use App\Http\Requests\FormRequest\StoreFormRequestRequest;
use App\Http\Requests\FormRequest\SyncCcUsersRequest;
use App\Http\Requests\FormRequest\UpdateFormRequestRequest;
use App\Models\FormRequest;
use App\Models\FormRequestAttachment;
use App\Models\FormTemplate;
use App\Models\RequestComment;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use App\Services\AuditService;
use App\Services\RequestWorkflowService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FormRequestController extends Controller
{
    public function __construct(
        protected AuditService $auditService,
        protected RequestWorkflowService $workflowService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = FormRequest::with($this->workflowService->defaultRelations());

        if ($request->filled('folder')) {
            $this->applyFolderFilter($query, $request->string('folder')->toString(), $user);
        } elseif (! $user->isAdminLevel()) {
            $query->where(function (Builder $q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhere('target_department_id', $user->department_id);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('target_department_id')) {
            $query->where('target_department_id', $request->target_department_id);
        }

        if ($request->filled('target_section_id')) {
            $query->where('target_section_id', $request->target_section_id);
        }

        if ($request->filled('form_template_id')) {
            $query->where('form_template_id', $request->form_template_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function (Builder $q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhereHas('formTemplate', fn ($tq) => $tq
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('title', 'like', "%{$search}%"))
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%"));
            });
        }

        return response()->json(['data' => $query->latest()->paginate($request->integer('per_page', 15))]);
    }

    public function counts(Request $request): JsonResponse
    {
        $user = $request->user();

        $folders = ['drafts', 'outbox', 'inbox', 'dept_review', 'section_inbox', 'cc', 'approved', 'rejected'];
        $counts = [];

        foreach ($folders as $folder) {
            $query = FormRequest::query();
            $this->applyFolderFilter($query, $folder, $user);
            $counts[$folder] = $query->count();
        }

        return response()->json(['data' => $counts]);
    }

    protected function applyFolderFilter(Builder $query, string $folder, $user): void
    {
        match ($folder) {
            'drafts' => $query->where('user_id', $user->id)
                ->where('status', RequestStatus::Draft->value),
            'outbox' => $query->where('user_id', $user->id)
                ->where('status', '!=', RequestStatus::Draft->value),
            'inbox' => $query->where('review_department_id', $user->department_id)
                ->where('status', RequestStatus::Submitted->value),
            'dept_review' => $query->where('target_department_id', $user->department_id)
                ->where('status', RequestStatus::DeptApproved->value),
            'section_inbox' => $query->where('target_section_id', $user->section_id)
                ->where('status', RequestStatus::AtSection->value),
            'cc' => $query->whereHas('ccUsers', fn (Builder $q) => $q->where('users.id', $user->id)),
            'approved' => $query->where('status', RequestStatus::Approved->value)
                ->when(! $user->isAdminLevel(), fn (Builder $q) => $q->where(fn (Builder $inner) => $inner
                    ->where('user_id', $user->id)
                    ->orWhere('target_department_id', $user->department_id))),
            'rejected' => $query->where('status', RequestStatus::Rejected->value)
                ->when(! $user->isAdminLevel(), fn (Builder $q) => $q->where(fn (Builder $inner) => $inner
                    ->where('user_id', $user->id)
                    ->orWhere('target_department_id', $user->department_id))),
            default => $query,
        };
    }

    public function store(StoreFormRequestRequest $request): JsonResponse
    {
        $template = FormTemplate::findOrFail($request->form_template_id);

        $formRequest = FormRequest::create([
            'reference_no' => $this->workflowService->generateReferenceNo(),
            'user_id' => $request->user()->id,
            'form_template_id' => $template->id,
            'target_department_id' => $request->target_department_id,
            'target_section_id' => $request->target_section_id,
            'type' => RequestType::General,
            'title' => $template->title,
            'description' => $template->description,
            'data' => $request->data,
            'status' => RequestStatus::Draft,
        ]);

        $this->auditService->log(AuditAction::Created, $formRequest);

        return response()->json([
            'message' => 'Request draft created.',
            'data' => $formRequest->load($this->workflowService->defaultRelations()),
        ], 201);
    }

    public function show(FormRequest $formRequest): JsonResponse
    {
        $this->authorize('view', $formRequest);

        return response()->json([
            'data' => $formRequest->load($this->workflowService->defaultRelations()),
        ]);
    }

    public function update(UpdateFormRequestRequest $request, FormRequest $formRequest): JsonResponse
    {
        $old = $formRequest->toArray();
        $formRequest->update($request->validated());
        $this->auditService->log(AuditAction::Updated, $formRequest, null, $old, $formRequest->toArray());

        return response()->json([
            'message' => 'Request updated successfully.',
            'data' => $formRequest->fresh($this->workflowService->defaultRelations()),
        ]);
    }

    public function destroy(FormRequest $formRequest): JsonResponse
    {
        $this->authorize('delete', $formRequest);
        $this->auditService->log(AuditAction::Deleted, $formRequest);
        $formRequest->delete();

        return response()->json(['message' => 'Request deleted successfully.']);
    }

    public function submit(FormRequest $formRequest): JsonResponse
    {
        $this->authorize('submit', $formRequest);
        $formRequest = $this->workflowService->submit($formRequest);

        return response()->json([
            'message' => 'Request submitted successfully.',
            'data' => $formRequest,
        ]);
    }

    public function forwardToSection(ForwardSectionRequest $request, FormRequest $formRequest): JsonResponse
    {
        $formRequest = $this->workflowService->forwardToSection(
            $formRequest,
            $request->user(),
            (int) $request->target_section_id
        );

        return response()->json([
            'message' => 'Request forwarded to section successfully.',
            'data' => $formRequest,
        ]);
    }

    public function approve(ApprovalActionRequest $request, FormRequest $formRequest): JsonResponse
    {
        $formRequest = $this->workflowService->approve($formRequest, $request->user(), $request->input('comments'));

        return response()->json([
            'message' => 'Request approved.',
            'data' => $formRequest,
        ]);
    }

    public function reject(RejectFormRequestRequest $request, FormRequest $formRequest): JsonResponse
    {
        $formRequest = $this->workflowService->reject($formRequest, $request->user(), $request->comments);

        return response()->json([
            'message' => 'Request rejected.',
            'data' => $formRequest,
        ]);
    }

    public function returnForRevision(ReturnFormRequestRequest $request, FormRequest $formRequest): JsonResponse
    {
        $formRequest = $this->workflowService->returnForRevision($formRequest, $request->user(), $request->comments);

        return response()->json([
            'message' => 'Request returned for revision.',
            'data' => $formRequest,
        ]);
    }

    public function syncCcUsers(SyncCcUsersRequest $request, FormRequest $formRequest): JsonResponse
    {
        $formRequest = $this->workflowService->syncCcUsers(
            $formRequest,
            $request->user(),
            $request->input('user_ids', [])
        );

        return response()->json([
            'message' => 'CC users updated successfully.',
            'data' => $formRequest,
        ]);
    }

    public function ccCandidates(FormRequest $formRequest): JsonResponse
    {
        $this->authorize('manageCc', $formRequest);

        $users = User::query()
            ->where('status', 'active')
            ->where('id', '!=', $formRequest->user_id)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'employee_id', 'position', 'department_id']);

        return response()->json(['data' => $users]);
    }

    public function addComment(StoreCommentRequest $request, FormRequest $formRequest): JsonResponse
    {
        $comment = RequestComment::create([
            'form_request_id' => $formRequest->id,
            'user_id' => $request->user()->id,
            'comment' => $request->comment,
        ]);

        return response()->json([
            'message' => 'Comment added.',
            'data' => $comment->load('user'),
        ], 201);
    }

    public function uploadAttachment(Request $request, FormRequest $formRequest): JsonResponse
    {
        $this->authorize('update', $formRequest);

        $template = $formRequest->formTemplate;
        $attachmentType = $template?->attachment_type ?? 'none';

        if ($attachmentType === 'none') {
            return response()->json(['message' => 'This form does not allow attachments.'], 422);
        }

        $request->validate([
            'file' => ['required', 'file', 'max:30720'],
        ]);

        if ($attachmentType === 'single' && $formRequest->attachments()->count() >= 1) {
            return response()->json(['message' => 'Only one attachment is allowed for this form.'], 422);
        }

        $file = $request->file('file');
        $path = $file->store('form-request-attachments', 'documents');

        $attachment = FormRequestAttachment::create([
            'form_request_id' => $formRequest->id,
            'uploaded_by' => $request->user()->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ]);

        return response()->json([
            'message' => 'Attachment uploaded.',
            'data' => $attachment->load('uploader'),
        ], 201);
    }

    public function downloadAttachment(FormRequest $formRequest, FormRequestAttachment $attachment)
    {
        $this->authorize('view', $formRequest);

        if ($attachment->form_request_id !== $formRequest->id) {
            abort(404);
        }

        if (! Storage::disk('documents')->exists($attachment->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        return Storage::disk('documents')->download($attachment->file_path, $attachment->file_name);
    }

    public function deleteAttachment(Request $request, FormRequest $formRequest, FormRequestAttachment $attachment): JsonResponse
    {
        $this->authorize('update', $formRequest);

        if ($attachment->form_request_id !== $formRequest->id) {
            abort(404);
        }

        Storage::disk('documents')->delete($attachment->file_path);
        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted.']);
    }
}
