<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\NotificationType;
use App\Enums\RequestStatus;
use App\Models\FormRequest;
use App\Models\FormRequestAction;
use App\Models\Section;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RequestWorkflowService
{
    public function __construct(
        protected AuditService $auditService,
        protected NotificationService $notificationService,
        protected RealtimeService $realtimeService,
    ) {}

    protected function broadcastUpdate(FormRequest $formRequest): void
    {
        $this->realtimeService->bumpForFormRequest($formRequest);
    }

    public function generateReferenceNo(): string
    {
        return 'REQ-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
    }

    public function submit(FormRequest $formRequest): FormRequest
    {
        if (! $formRequest->status->isSubmittable()) {
            throw ValidationException::withMessages([
                'status' => ['This request cannot be submitted in its current status.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest) {
            $wasReturned = $formRequest->status === RequestStatus::Returned;
            $fromStatus = $wasReturned ? RequestStatus::Returned->value : RequestStatus::Draft->value;

            if ($wasReturned && $formRequest->assigned_to_id) {
                $toStatus = RequestStatus::Assigned;
                $formRequest->update([
                    'status' => $toStatus,
                    'submitted_at' => now(),
                ]);
                $this->logAction($formRequest, $formRequest->user, 'submitted', $fromStatus, $toStatus->value);
                $this->auditService->log(AuditAction::Submitted, $formRequest);
                $this->notifyUser($formRequest->assignedTo, 'Request Resubmitted', "Request \"{$formRequest->title}\" has been resubmitted.");

                $updated = $formRequest->fresh($this->defaultRelations());
                $this->broadcastUpdate($updated);

                return $updated;
            }

            $reviewDepartmentId = $this->resolveInitialReviewDepartment($formRequest);

            $formRequest->update([
                'status' => RequestStatus::Submitted,
                'submitted_at' => now(),
                'review_department_id' => $reviewDepartmentId,
                'dept_reviewed_by_id' => null,
                'dept_reviewed_at' => null,
                'endorsed_by_source_at' => null,
                'assigned_to_id' => null,
                'assigned_by_id' => null,
                'assigned_at' => null,
                'target_section_id' => null,
            ]);

            $this->logAction($formRequest, $formRequest->user, 'submitted', $fromStatus, RequestStatus::Submitted->value);
            $this->auditService->log(AuditAction::Submitted, $formRequest);
            $this->notifyReviewDepartment($formRequest);

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    protected function resolveInitialReviewDepartment(FormRequest $formRequest): int
    {
        $sourceDeptId = $formRequest->user?->department_id;
        $targetDeptId = $formRequest->target_department_id;

        if ($sourceDeptId && $targetDeptId && (int) $sourceDeptId !== (int) $targetDeptId) {
            return (int) $sourceDeptId;
        }

        return (int) $targetDeptId;
    }

    protected function isCrossDepartmentRequest(FormRequest $formRequest): bool
    {
        $sourceDeptId = $formRequest->user?->department_id;
        $targetDeptId = $formRequest->target_department_id;

        return $sourceDeptId && $targetDeptId && (int) $sourceDeptId !== (int) $targetDeptId;
    }

    protected function isSourceDepartmentReviewStep(FormRequest $formRequest): bool
    {
        return $this->isCrossDepartmentRequest($formRequest)
            && ! $formRequest->endorsed_by_source_at;
    }

    public function deptReviewApprove(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        if ($formRequest->user_id === $actor->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot review your own request.'],
            ]);
        }

        if ($formRequest->status !== RequestStatus::Submitted) {
            throw ValidationException::withMessages([
                'status' => ['Only submitted requests can be reviewed at department level.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $actor, $remark) {
            $from = $formRequest->status->value;
            $isSourceStep = $this->isSourceDepartmentReviewStep($formRequest);

            if ($isSourceStep) {
                // Cross-dept step 1: source dept admin endorses → target dept inbox (still submitted).
                $formRequest->update([
                    'status' => RequestStatus::Submitted,
                    'dept_reviewed_by_id' => $actor->id,
                    'dept_reviewed_at' => now(),
                    'endorsed_by_source_at' => now(),
                    'review_department_id' => $formRequest->target_department_id,
                    'assigned_to_id' => null,
                    'assigned_by_id' => null,
                    'assigned_at' => null,
                ]);

                $this->logAction($formRequest, $actor, 'source_endorsed', $from, RequestStatus::Submitted->value, null, null, $remark);
                $this->auditService->log(AuditAction::Approved, $formRequest, $actor, null, ['remark' => $remark, 'stage' => 'source_department']);
                $formRequest->refresh();
                $this->notifyReviewDepartment($formRequest);
            } else {
                // Same-dept or cross-dept step 2: final dept approval → ready to assign.
                $formRequest->update([
                    'status' => RequestStatus::DeptApproved,
                    'dept_reviewed_by_id' => $actor->id,
                    'dept_reviewed_at' => now(),
                    'review_department_id' => $formRequest->target_department_id,
                    'assigned_to_id' => null,
                    'assigned_by_id' => null,
                    'assigned_at' => null,
                ]);

                $this->logAction($formRequest, $actor, 'dept_approved', $from, RequestStatus::DeptApproved->value, null, null, $remark);
                $this->auditService->log(AuditAction::Approved, $formRequest, $actor, null, ['remark' => $remark, 'stage' => 'target_department']);

                $message = "Request \"{$formRequest->title}\" was approved and is ready for assignment.";
                $this->notifyTargetDepartmentForAssignment($formRequest, $message);
            }

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    public function deptReviewReject(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        return $this->deptReviewDecision($formRequest, $actor, 'rejected', RequestStatus::Rejected, $remark, AuditAction::Rejected);
    }

    public function deptReviewReturn(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        return $this->deptReviewDecision($formRequest, $actor, 'returned', RequestStatus::Returned, $remark, AuditAction::Returned);
    }

    protected function deptReviewDecision(
        FormRequest $formRequest,
        User $actor,
        string $action,
        RequestStatus $toStatus,
        string $remark,
        AuditAction $auditAction,
    ): FormRequest {
        if ($formRequest->status !== RequestStatus::Submitted) {
            throw ValidationException::withMessages([
                'status' => ['Only submitted requests can be reviewed at department level.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $actor, $action, $toStatus, $remark, $auditAction) {
            $from = $formRequest->status->value;

            $formRequest->update([
                'status' => $toStatus,
                'dept_reviewed_by_id' => $actor->id,
                'dept_reviewed_at' => now(),
            ]);

            $this->logAction($formRequest, $actor, $action, $from, $toStatus->value, null, null, $remark);
            $this->auditService->log($auditAction, $formRequest, $actor, null, ['remark' => $remark, 'stage' => 'department']);

            $title = $action === 'rejected' ? 'Request Rejected' : 'Request Returned';
            $this->notifyUser($formRequest->user, $title, "Your request \"{$formRequest->title}\" was {$action}.");

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    public function forwardToSection(FormRequest $formRequest, User $actor, int $sectionId): FormRequest
    {
        if ($formRequest->status !== RequestStatus::DeptApproved) {
            throw ValidationException::withMessages([
                'status' => ['Request must be department-approved before forwarding to a section.'],
            ]);
        }

        $section = Section::query()
            ->where('id', $sectionId)
            ->where('department_id', $formRequest->target_department_id)
            ->first();

        if (! $section) {
            throw ValidationException::withMessages([
                'target_section_id' => ['Section must belong to the target department.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $actor, $section) {
            $from = $formRequest->status->value;

            $formRequest->update([
                'target_section_id' => $section->id,
                'status' => RequestStatus::AtSection,
                'assigned_to_id' => null,
                'assigned_by_id' => null,
                'assigned_at' => null,
            ]);

            $this->logAction($formRequest, $actor, 'forwarded_section', $from, RequestStatus::AtSection->value, null, $section->id);

            if ($section->head) {
                $this->notifyUser($section->head, 'Request Forwarded to Section', "Request \"{$formRequest->title}\" was forwarded to your section.");
            }

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    public function assign(FormRequest $formRequest, User $assigner, int $assignedToId, ?string $remark = null): FormRequest
    {
        if (! in_array($formRequest->status, [RequestStatus::DeptApproved, RequestStatus::AtSection], true)) {
            throw ValidationException::withMessages([
                'status' => ['Request must be department-approved before assignment.'],
            ]);
        }

        if ($assignedToId === $formRequest->user_id) {
            throw ValidationException::withMessages([
                'assigned_to_id' => ['Cannot assign a request to the person who submitted it.'],
            ]);
        }

        $assignee = $this->resolveAssignee($formRequest, $assignedToId);

        return DB::transaction(function () use ($formRequest, $assigner, $assignee, $remark) {
            $from = $formRequest->status->value;

            $formRequest->update([
                'assigned_to_id' => $assignee->id,
                'assigned_by_id' => $assigner->id,
                'assigned_at' => now(),
                'status' => RequestStatus::Assigned,
            ]);

            $this->logAction($formRequest, $assigner, 'assigned', $from, RequestStatus::Assigned->value, $assignee->id, null, $remark);

            $message = "Request \"{$formRequest->title}\" has been assigned to you.";
            if ($remark) {
                $message .= " Remark: {$remark}";
            }

            $this->notifyUser($assignee, 'Request Assigned', $message);
            $this->notifyCcUsers($formRequest, 'Request Assigned', $message);

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    public function syncCcUsers(FormRequest $formRequest, User $actor, array $userIds): FormRequest
    {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));

        $validIds = User::query()
            ->where('status', 'active')
            ->where('department_id', $formRequest->target_department_id)
            ->whereIn('id', $userIds)
            ->pluck('id')
            ->all();

        if (count($validIds) !== count($userIds)) {
            throw ValidationException::withMessages([
                'user_ids' => ['CC users must be active members of the target department.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $actor, $validIds) {
            $existingIds = $formRequest->ccUsers()->pluck('users.id')->all();
            $newIds = array_diff($validIds, $existingIds);

            $syncData = [];
            foreach ($validIds as $userId) {
                $syncData[$userId] = ['added_by_id' => $actor->id];
            }

            $formRequest->ccUsers()->sync($syncData);

            foreach ($newIds as $newId) {
                $ccUser = User::find($newId);
                $this->notifyUser(
                    $ccUser,
                    'Added as CC on Request',
                    "You were CC'd on request \"{$formRequest->title}\" by {$actor->name}."
                );
            }

            if ($newIds !== []) {
                $this->logAction(
                    $formRequest,
                    $actor,
                    'cc_updated',
                    $formRequest->status->value,
                    $formRequest->status->value,
                    null,
                    null,
                    'CC users updated'
                );
            }

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    public function returnToDeptAdmin(FormRequest $formRequest, User $processor, string $remark): FormRequest
    {
        if ($formRequest->status !== RequestStatus::Assigned) {
            throw ValidationException::withMessages([
                'status' => ['Only assigned requests can be returned to department admin.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $processor, $remark) {
            $from = $formRequest->status->value;

            $formRequest->update([
                'status' => RequestStatus::DeptApproved,
                'assigned_to_id' => null,
                'assigned_by_id' => null,
                'assigned_at' => null,
            ]);

            $this->logAction($formRequest, $processor, 'returned_to_dept', $from, RequestStatus::DeptApproved->value, null, null, $remark);
            $this->auditService->log(AuditAction::Returned, $formRequest, $processor, null, ['remark' => $remark, 'stage' => 'return_to_dept']);

            $message = "Request \"{$formRequest->title}\" was returned by {$processor->name} for reassignment.";
            $this->notifyTargetDepartmentForAssignment($formRequest, $message);
            $this->notifyCcUsers($formRequest, 'Request Returned to Department', $message);

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    public function deptReturnToSubmitter(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        if ($formRequest->status !== RequestStatus::DeptApproved) {
            throw ValidationException::withMessages([
                'status' => ['Only department-approved requests can be returned to the requester.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $actor, $remark) {
            $from = $formRequest->status->value;

            $formRequest->update([
                'status' => RequestStatus::Returned,
                'assigned_to_id' => null,
                'assigned_by_id' => null,
                'assigned_at' => null,
            ]);

            $this->logAction($formRequest, $actor, 'returned_to_requester', $from, RequestStatus::Returned->value, null, null, $remark);
            $this->auditService->log(AuditAction::Returned, $formRequest, $actor, null, ['remark' => $remark, 'stage' => 'dept_to_requester']);

            $this->notifyUser($formRequest->user, 'Request Returned', "Your request \"{$formRequest->title}\" was returned by department admin. Remark: {$remark}");

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    protected function resolveAssignee(FormRequest $formRequest, int $assignedToId): User
    {
        $query = User::query()->where('id', $assignedToId)->where('status', 'active');

        if ($formRequest->status === RequestStatus::AtSection && $formRequest->target_section_id) {
            $assignee = $query->where('section_id', $formRequest->target_section_id)->first();
        } else {
            $assignee = $query->where('department_id', $formRequest->target_department_id)->first();
        }

        if (! $assignee) {
            throw ValidationException::withMessages([
                'assigned_to_id' => ['Selected user must be an active member of the target department/section.'],
            ]);
        }

        return $assignee;
    }

    public function returnForRevision(FormRequest $formRequest, User $processor, string $remark): FormRequest
    {
        return match ($formRequest->status) {
            RequestStatus::Submitted => $this->deptReviewReturn($formRequest, $processor, $remark),
            RequestStatus::DeptApproved => $this->deptReturnToSubmitter($formRequest, $processor, $remark),
            RequestStatus::Assigned => $this->returnToDeptAdmin($formRequest, $processor, $remark),
            default => throw ValidationException::withMessages([
                'status' => ['This request cannot be returned in its current status.'],
            ]),
        };
    }

    public function approve(FormRequest $formRequest, User $processor, string $remark): FormRequest
    {
        if ($formRequest->status === RequestStatus::Submitted) {
            return $this->deptReviewApprove($formRequest, $processor, $remark);
        }

        return $this->processDecision($formRequest, $processor, 'approved', RequestStatus::Approved, $remark, true);
    }

    public function reject(FormRequest $formRequest, User $processor, string $remark): FormRequest
    {
        if ($formRequest->status === RequestStatus::Submitted) {
            return $this->deptReviewReject($formRequest, $processor, $remark);
        }

        return $this->processDecision($formRequest, $processor, 'rejected', RequestStatus::Rejected, $remark, false);
    }

    protected function processDecision(
        FormRequest $formRequest,
        User $processor,
        string $action,
        RequestStatus $toStatus,
        string $remark,
        bool $isApproval,
    ): FormRequest {
        if ($formRequest->status !== RequestStatus::Assigned) {
            throw ValidationException::withMessages([
                'status' => ['Only assigned requests can be processed at this stage.'],
            ]);
        }

        if ($formRequest->user_id === $processor->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot process your own request.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $processor, $action, $toStatus, $remark, $isApproval) {
            $from = $formRequest->status->value;

            $updates = ['status' => $toStatus];

            if ($isApproval) {
                $updates['final_approved_by_id'] = $processor->id;
                $updates['final_approved_at'] = now();
                $updates['completed_at'] = now();
            }

            $formRequest->update($updates);

            $this->logAction($formRequest, $processor, $action, $from, $toStatus->value, null, null, $remark);

            $title = match ($action) {
                'approved' => 'Request Approved',
                'rejected' => 'Request Rejected',
                default => 'Request Returned',
            };

            $this->notifyUser($formRequest->user, $title, "Your request \"{$formRequest->title}\" was {$action}.");

            $audit = match ($action) {
                'approved' => AuditAction::Approved,
                'rejected' => AuditAction::Rejected,
                default => AuditAction::Returned,
            };

            $this->auditService->log($audit, $formRequest, $processor, null, ['remark' => $remark, 'stage' => 'final']);

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    protected function logAction(
        FormRequest $formRequest,
        User $user,
        string $action,
        ?string $fromStatus,
        ?string $toStatus,
        ?int $assignedToId = null,
        ?int $targetSectionId = null,
        ?string $remark = null,
    ): void {
        FormRequestAction::create([
            'form_request_id' => $formRequest->id,
            'user_id' => $user->id,
            'action' => $action,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'assigned_to_id' => $assignedToId,
            'target_section_id' => $targetSectionId,
            'remark' => $remark,
        ]);
    }

    protected function notifyUser(?User $user, string $title, string $message): void
    {
        if (! $user) {
            return;
        }

        $this->notificationService->create(
            $user,
            NotificationType::Request,
            $title,
            $message,
            []
        );
    }

    protected function notifyReviewDepartment(FormRequest $formRequest): void
    {
        $department = $formRequest->reviewDepartment ?? $formRequest->targetDepartment;
        $head = $department?->head;
        $this->notifyUser($head, 'New Request for Review', "New request \"{$formRequest->title}\" is waiting for department admin review.");
    }

    protected function notifyTargetDepartmentForAssignment(FormRequest $formRequest, string $message): void
    {
        $head = $formRequest->targetDepartment?->head;
        $this->notifyUser($head, 'Request Ready for Assignment', $message);
    }

    protected function notifyCcUsers(FormRequest $formRequest, string $title, string $message): void
    {
        $formRequest->loadMissing('ccUsers');

        foreach ($formRequest->ccUsers as $ccUser) {
            $this->notifyUser($ccUser, $title, $message);
        }
    }

    public function defaultRelations(): array
    {
        return [
            'user.department',
            'user.section',
            'formTemplate',
            'targetDepartment',
            'targetSection',
            'reviewDepartment',
            'deptReviewedBy',
            'assignedTo',
            'assignedBy',
            'finalApprovedBy',
            'ccUsers.department',
            'comments.user',
            'actions.user',
            'actions.assignedTo',
            'actions.targetSection',
        ];
    }
}
