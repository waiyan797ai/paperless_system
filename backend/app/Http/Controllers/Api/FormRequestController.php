<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Enums\RequestStatus;
use App\Enums\RequestType;
use App\Http\Controllers\Controller;
use App\Http\Requests\FormRequest\ApprovalActionRequest;
use App\Http\Requests\FormRequest\AssignFormRequestRequest;
use App\Http\Requests\FormRequest\ForwardSectionRequest;
use App\Http\Requests\FormRequest\RejectFormRequestRequest;
use App\Http\Requests\FormRequest\ReturnFormRequestRequest;
use App\Http\Requests\FormRequest\StoreCommentRequest;
use App\Http\Requests\FormRequest\StoreFormRequestRequest;
use App\Http\Requests\FormRequest\SyncCcUsersRequest;
use App\Http\Requests\FormRequest\UpdateFormRequestRequest;
use App\Models\FormRequest;
use App\Models\FormTemplate;
use App\Models\RequestComment;
use App\Models\User;
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
                    ->orWhere('assigned_to_id', $user->id)
                    ->orWhere('target_department_id', $user->department_id);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function (Builder $q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhereHas('formTemplate', fn ($tq) => $tq
                        ->where('code', 'like', "%{$search}%")
                        ->orWhere('title', 'like', "%{$search}%"));
            });
        }

        return response()->json(['data' => $query->latest()->paginate($request->integer('per_page', 15))]);
    }

    public function counts(Request $request): JsonResponse
    {
        $user = $request->user();

        $folders = ['outbox', 'inbox', 'to_assign', 'section_inbox', 'assign', 'cc', 'approved', 'rejected'];
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
            'outbox' => $query->where('user_id', $user->id)
                ->where('status', '!=', RequestStatus::Draft->value),
            'inbox' => $query->where('review_department_id', $user->department_id)
                ->where('status', RequestStatus::Submitted->value),
            'to_assign' => $query->where('target_department_id', $user->department_id)
                ->where('status', RequestStatus::DeptApproved->value),
            'section_inbox' => $query->where('target_section_id', $user->section_id)
                ->where('status', RequestStatus::AtSection->value),
            'assign' => $query->where('assigned_to_id', $user->id)
                ->where('status', RequestStatus::Assigned->value),
            'cc' => $query->whereHas('ccUsers', fn (Builder $q) => $q->where('users.id', $user->id)),
            'approved' => $query->where('status', RequestStatus::Approved->value)
                ->when(! $user->isAdminLevel(), fn (Builder $q) => $q->where(fn (Builder $inner) => $inner
                    ->where('user_id', $user->id)
                    ->orWhere('assigned_to_id', $user->id))),
            'rejected' => $query->where('status', RequestStatus::Rejected->value)
                ->when(! $user->isAdminLevel(), fn (Builder $q) => $q->where(fn (Builder $inner) => $inner
                    ->where('user_id', $user->id)
                    ->orWhere('assigned_to_id', $user->id))),
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

    public function assignableUsers(FormRequest $formRequest): JsonResponse
    {
        $this->authorize('assign', $formRequest);

        $query = User::query()->where('status', 'active')->orderBy('name');

        if ($formRequest->status === RequestStatus::AtSection && $formRequest->target_section_id) {
            $query->where('section_id', $formRequest->target_section_id);
        } elseif (in_array($formRequest->status, [RequestStatus::DeptApproved, RequestStatus::Submitted], true)) {
            $query->where('department_id', $formRequest->target_department_id);
        } else {
            $query->where('department_id', $formRequest->target_department_id);
        }

        return response()->json(['data' => $query->get(['id', 'name', 'email', 'employee_id', 'position', 'department_id', 'section_id'])]);
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

    public function assign(AssignFormRequestRequest $request, FormRequest $formRequest): JsonResponse
    {
        $formRequest = $this->workflowService->assign(
            $formRequest,
            $request->user(),
            (int) $request->assigned_to_id,
            $request->input('remark')
        );

        return response()->json([
            'message' => 'Request assigned successfully.',
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
            ->where('department_id', $formRequest->target_department_id)
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
}
