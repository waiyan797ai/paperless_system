<?php

namespace App\Services;

use App\Http\Controllers\Api\RealtimeController;
use App\Models\Department;
use App\Models\Document;
use App\Models\FormRequest;
use App\Models\User;

class RealtimeService
{
    public function bumpForFormRequest(FormRequest $formRequest): void
    {
        $formRequest->loadMissing(['user', 'assignedTo', 'targetDepartment', 'reviewDepartment', 'ccUsers']);

        $userIds = array_filter([
            $formRequest->user_id,
            $formRequest->assigned_to_id,
            $formRequest->targetDepartment?->head_id,
            $formRequest->reviewDepartment?->head_id,
        ]);

        foreach ($formRequest->ccUsers as $ccUser) {
            $userIds[] = $ccUser->id;
        }

        if ($formRequest->target_department_id) {
            $deptAdmins = User::query()
                ->where('department_id', $formRequest->target_department_id)
                ->whereHas('role', fn ($q) => $q->whereIn('name', ['department_admin', 'department_head', 'admin', 'super_admin']))
                ->pluck('id')
                ->all();
            $userIds = array_merge($userIds, $deptAdmins);
        }

        if ($formRequest->review_department_id) {
            $reviewAdmins = User::query()
                ->where('department_id', $formRequest->review_department_id)
                ->whereHas('role', fn ($q) => $q->whereIn('name', ['department_admin', 'department_head', 'admin', 'super_admin']))
                ->pluck('id')
                ->all();
            $userIds = array_merge($userIds, $reviewAdmins);
        }

        RealtimeController::bumpRequestVersionForUsers($userIds);
    }

    public function bumpForDocumentDistribution(Document $document, array $departmentIds, int $distributedBy): void
    {
        $document->loadMissing('uploader');

        $userIds = [$distributedBy];

        $headIds = Department::whereIn('id', $departmentIds)->whereNotNull('head_id')->pluck('head_id');
        $recipientAdminIds = User::query()
            ->whereIn('department_id', $departmentIds)
            ->where('status', 'active')
            ->where(function ($q) use ($headIds) {
                $q->whereHas('role', fn ($rq) => $rq->whereIn('name', ['department_admin', 'department_head']))
                    ->orWhereIn('id', $headIds);
            })
            ->pluck('id')
            ->all();
        $userIds = array_merge($userIds, $recipientAdminIds);

        if ($document->uploader?->department_id) {
            $senderDeptUserIds = User::query()
                ->where('department_id', $document->uploader->department_id)
                ->where('status', 'active')
                ->pluck('id')
                ->all();
            $userIds = array_merge($userIds, $senderDeptUserIds);
        }

        $adminIds = User::query()
            ->whereHas('role', fn ($q) => $q->whereIn('name', ['admin', 'super_admin']))
            ->pluck('id')
            ->all();
        $userIds = array_merge($userIds, $adminIds);

        RealtimeController::bumpDocumentVersionForUsers($userIds);
    }

    public function bumpForDocumentForward(Document $document, array $userIds, int $forwardedBy): void
    {
        $document->loadMissing('uploader');

        $allUserIds = array_merge($userIds, [$forwardedBy]);

        if ($document->uploader?->department_id) {
            $deptAdminIds = User::query()
                ->where('department_id', $document->uploader->department_id)
                ->where('status', 'active')
                ->whereHas('role', fn ($q) => $q->whereIn('name', ['department_admin', 'department_head']))
                ->pluck('id')
                ->all();
            $allUserIds = array_merge($allUserIds, $deptAdminIds);
        }

        $adminIds = User::query()
            ->whereHas('role', fn ($q) => $q->whereIn('name', ['admin', 'super_admin']))
            ->pluck('id')
            ->all();
        $allUserIds = array_merge($allUserIds, $adminIds);

        RealtimeController::bumpDocumentVersionForUsers($allUserIds);
    }
}
