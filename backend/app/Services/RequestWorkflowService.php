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

    // ─── Submit ──────────────────────────────────────────────────────
    // Draft/Returned → Submitted (goes to own department head)

    public function submit(FormRequest $formRequest): FormRequest
    {
        if (! $formRequest->status->isSubmittable()) {
            throw ValidationException::withMessages([
                'status' => ['This request cannot be submitted in its current status.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest) {
            $fromStatus = $formRequest->status->value;

            $reviewDepartmentId = $this->resolveInitialReviewDepartment($formRequest);

            $formRequest->update([
                'status' => RequestStatus::Submitted,
                'submitted_at' => now(),
                'review_department_id' => $reviewDepartmentId,
                'dept_reviewed_by_id' => null,
                'dept_reviewed_at' => null,
                'endorsed_by_source_at' => null,
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

    // ─── Own Dept Head Approve ───────────────────────────────────────
    // Submitted → DeptApproved (then goes to target dept head)
    // For cross-dept: source dept head endorses first, then target dept head reviews.

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
                ]);

                $this->logAction($formRequest, $actor, 'source_endorsed', $from, RequestStatus::Submitted->value, null, null, $remark);
                $this->auditService->log(AuditAction::Approved, $formRequest, $actor, null, ['remark' => $remark, 'stage' => 'source_department']);
                $formRequest->refresh();
                $this->notifyReviewDepartment($formRequest);
            } else {
                // Same-dept or cross-dept step 2: target dept head approves → DeptApproved.
                $formRequest->update([
                    'status' => RequestStatus::DeptApproved,
                    'dept_reviewed_by_id' => $actor->id,
                    'dept_reviewed_at' => now(),
                    'review_department_id' => $formRequest->target_department_id,
                ]);

                $this->logAction($formRequest, $actor, 'dept_approved', $from, RequestStatus::DeptApproved->value, null, null, $remark);
                $this->auditService->log(AuditAction::Approved, $formRequest, $actor, null, ['remark' => $remark, 'stage' => 'own_department']);

                $this->notifyUser($formRequest->user, 'Request Department Approved', "Your request \"{$formRequest->title}\" was approved by department head.");
                $this->notifyCcUsers($formRequest, 'Request Department Approved', "Request \"{$formRequest->title}\" was approved at department level.");
            }

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    // ─── Target Dept Head Approve ────────────────────────────────────
    // DeptApproved → AtSection (if section selected, section head will approve)
    // DeptApproved → Approved (no section, target dept head directly approves)

    public function targetDeptApprove(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        if ($formRequest->user_id === $actor->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot approve your own request.'],
            ]);
        }

        if ($formRequest->status !== RequestStatus::DeptApproved) {
            throw ValidationException::withMessages([
                'status' => ['Only department-approved requests can be processed by the target department.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $actor, $remark) {
            $from = $formRequest->status->value;
            $formRequest->loadMissing('formTemplate');
            $section = $this->resolveTargetSection($formRequest);

            if ($section) {
                // Forward to section → section head will approve
                $formRequest->update([
                    'status' => RequestStatus::AtSection,
                    'target_section_id' => $section->id,
                ]);

                $this->logAction($formRequest, $actor, 'forwarded_section', $from, RequestStatus::AtSection->value, null, $section->id, $remark);
                $this->auditService->log(AuditAction::Approved, $formRequest, $actor, null, ['remark' => $remark, 'stage' => 'target_department', 'section_id' => $section->id]);

                if ($section->head) {
                    $this->notifyUser($section->head, 'Request Forwarded to Section', "Request \"{$formRequest->title}\" needs your approval.");
                }
                $this->notifyCcUsers($formRequest, 'Request Forwarded to Section', "Request \"{$formRequest->title}\" was forwarded to section for approval.");
            } else {
                // No section → target dept head directly approves
                $formRequest->update([
                    'status' => RequestStatus::Approved,
                    'final_approved_by_id' => $actor->id,
                    'final_approved_at' => now(),
                    'completed_at' => now(),
                ]);

                $this->logAction($formRequest, $actor, 'approved', $from, RequestStatus::Approved->value, null, null, $remark);
                $this->auditService->log(AuditAction::Approved, $formRequest, $actor, null, ['remark' => $remark, 'stage' => 'target_department_final']);

                $this->notifyUser($formRequest->user, 'Request Approved', "Your request \"{$formRequest->title}\" has been approved.");
                $this->notifyCcUsers($formRequest, 'Request Approved', "Request \"{$formRequest->title}\" has been approved.");
            }

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    // ─── Section Head Approve ────────────────────────────────────────
    // AtSection → Approved (section head gives final approval)

    public function sectionApprove(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        if ($formRequest->user_id === $actor->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot approve your own request.'],
            ]);
        }

        if ($formRequest->status !== RequestStatus::AtSection) {
            throw ValidationException::withMessages([
                'status' => ['Only requests at section level can be approved by section head.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $actor, $remark) {
            $from = $formRequest->status->value;

            $formRequest->update([
                'status' => RequestStatus::Approved,
                'final_approved_by_id' => $actor->id,
                'final_approved_at' => now(),
                'completed_at' => now(),
            ]);

            $this->logAction($formRequest, $actor, 'approved', $from, RequestStatus::Approved->value, null, null, $remark);
            $this->auditService->log(AuditAction::Approved, $formRequest, $actor, null, ['remark' => $remark, 'stage' => 'section_final']);

            $this->notifyUser($formRequest->user, 'Request Approved', "Your request \"{$formRequest->title}\" has been approved by section head.");
            $this->notifyCcUsers($formRequest, 'Request Approved', "Request \"{$formRequest->title}\" has been approved.");

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    // ─── Forward to Section ──────────────────────────────────────────
    // DeptApproved → AtSection (target dept head manually forwards to a section)

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
            ]);

            $this->logAction($formRequest, $actor, 'forwarded_section', $from, RequestStatus::AtSection->value, null, $section->id);
            $this->auditService->log(AuditAction::Updated, $formRequest, $actor, null, ['action' => 'forwarded_section', 'section_id' => $section->id]);

            if ($section->head) {
                $this->notifyUser($section->head, 'Request Forwarded to Section', "Request \"{$formRequest->title}\" needs your approval.");
            }

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    // ─── Reject ──────────────────────────────────────────────────────

    public function deptReviewReject(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        return $this->reviewDecision($formRequest, $actor, 'rejected', RequestStatus::Rejected, $remark, AuditAction::Rejected);
    }

    public function deptReviewReturn(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        return $this->reviewDecision($formRequest, $actor, 'returned', RequestStatus::Returned, $remark, AuditAction::Returned);
    }

    protected function reviewDecision(
        FormRequest $formRequest,
        User $actor,
        string $action,
        RequestStatus $toStatus,
        string $remark,
        AuditAction $auditAction,
    ): FormRequest {
        $allowedStatuses = [
            RequestStatus::Submitted,
            RequestStatus::DeptApproved,
            RequestStatus::AtSection,
        ];

        if (! in_array($formRequest->status, $allowedStatuses, true)) {
            throw ValidationException::withMessages([
                'status' => ['This request cannot be '.$action.' in its current status.'],
            ]);
        }

        return DB::transaction(function () use ($formRequest, $actor, $action, $toStatus, $remark, $auditAction) {
            $from = $formRequest->status->value;

            $formRequest->update([
                'status' => $toStatus,
            ]);

            $this->logAction($formRequest, $actor, $action, $from, $toStatus->value, null, null, $remark);
            $this->auditService->log($auditAction, $formRequest, $actor, null, ['remark' => $remark, 'stage' => $from]);

            $title = $action === 'rejected' ? 'Request Rejected' : 'Request Returned';
            $this->notifyUser($formRequest->user, $title, "Your request \"{$formRequest->title}\" was {$action}.");
            $this->notifyCcUsers($formRequest, $title, "Request \"{$formRequest->title}\" was {$action}.");

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    protected function resolveTargetSection(FormRequest $formRequest): ?Section
    {
        $sectionId = $formRequest->target_section_id ?? $formRequest->formTemplate?->target_section_id;

        if (! $sectionId) {
            return null;
        }

        return Section::query()
            ->where('id', $sectionId)
            ->where('department_id', $formRequest->target_department_id)
            ->with('head')
            ->first();
    }

    // ─── CC ──────────────────────────────────────────────────────────

    public function syncCcUsers(FormRequest $formRequest, User $actor, array $userIds): FormRequest
    {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));

        $validIds = User::query()
            ->where('status', 'active')
            ->whereIn('id', $userIds)
            ->pluck('id')
            ->all();

        if (count($validIds) !== count($userIds)) {
            throw ValidationException::withMessages([
                'user_ids' => ['All CC users must be active.'],
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
                $this->auditService->log(AuditAction::Updated, $formRequest, $actor, null, ['action' => 'cc_updated', 'user_ids' => $validIds]);
            }

            $updated = $formRequest->fresh($this->defaultRelations());
            $this->broadcastUpdate($updated);

            return $updated;
        });
    }

    // ─── Unified Approve / Reject / Return ───────────────────────────

    public function approve(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        return match ($formRequest->status) {
            RequestStatus::Submitted => $this->deptReviewApprove($formRequest, $actor, $remark),
            RequestStatus::DeptApproved => $this->targetDeptApprove($formRequest, $actor, $remark),
            RequestStatus::AtSection => $this->sectionApprove($formRequest, $actor, $remark),
            default => throw ValidationException::withMessages([
                'status' => ['This request cannot be approved in its current status.'],
            ]),
        };
    }

    public function reject(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        return match ($formRequest->status) {
            RequestStatus::Submitted => $this->deptReviewReject($formRequest, $actor, $remark),
            RequestStatus::DeptApproved, RequestStatus::AtSection => $this->reviewDecision(
                $formRequest, $actor, 'rejected', RequestStatus::Rejected, $remark, AuditAction::Rejected
            ),
            default => throw ValidationException::withMessages([
                'status' => ['This request cannot be rejected in its current status.'],
            ]),
        };
    }

    public function returnForRevision(FormRequest $formRequest, User $actor, string $remark): FormRequest
    {
        return match ($formRequest->status) {
            RequestStatus::Submitted, RequestStatus::DeptApproved, RequestStatus::AtSection => $this->reviewDecision(
                $formRequest, $actor, 'returned', RequestStatus::Returned, $remark, AuditAction::Returned
            ),
            default => throw ValidationException::withMessages([
                'status' => ['This request cannot be returned in its current status.'],
            ]),
        };
    }

    // ─── Helpers ─────────────────────────────────────────────────────

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
        $this->notifyUser($head, 'New Request for Review', "New request \"{$formRequest->title}\" is waiting for your review.");
    }

    protected function notifyTargetDepartment(FormRequest $formRequest, string $title, string $message): void
    {
        $head = $formRequest->targetDepartment?->head;
        $this->notifyUser($head, $title, $message);
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
            'finalApprovedBy',
            'ccUsers.department',
            'comments.user',
            'actions.user',
            'actions.targetSection',
            'attachments.uploader',
        ];
    }
}
