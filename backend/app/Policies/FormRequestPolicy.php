<?php

namespace App\Policies;

use App\Enums\RequestStatus;
use App\Models\FormRequest;
use App\Models\User;

class FormRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('form_requests.create')
            || $user->hasPermission('form_requests.dept_inbox')
            || $user->hasPermission('form_requests.section_inbox')
            || $user->hasPermission('form_requests.approve');
    }

    public function view(User $user, FormRequest $formRequest): bool
    {
        if ($user->isAdminLevel()) {
            return true;
        }

        // Owner can always view
        if ($formRequest->user_id === $user->id) {
            return true;
        }

        // CC users can view
        if ($formRequest->ccUsers()->where('users.id', $user->id)->exists()) {
            return true;
        }

        // Department head can view requests in their dept inbox
        if ($user->hasPermission('form_requests.dept_inbox')) {
            if ($formRequest->status === RequestStatus::Submitted
                && $formRequest->review_department_id === $user->department_id) {
                return true;
            }

            // Target dept head can view dept_approved and at_section requests (view only for at_section)
            if (in_array($formRequest->status, [RequestStatus::DeptApproved, RequestStatus::AtSection], true)
                && $formRequest->target_department_id === $user->department_id) {
                return true;
            }
        }

        // Section head can view at_section requests in their section
        if ($user->hasPermission('form_requests.section_inbox')
            && $formRequest->target_section_id === $user->section_id
            && $formRequest->status === RequestStatus::AtSection) {
            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('form_requests.create');
    }

    public function update(User $user, FormRequest $formRequest): bool
    {
        return $formRequest->user_id === $user->id && $formRequest->status->isEditable();
    }

    public function delete(User $user, FormRequest $formRequest): bool
    {
        if ($user->isAdminLevel()) {
            return true;
        }

        return $formRequest->user_id === $user->id
            && $formRequest->status !== RequestStatus::Approved;
    }

    public function submit(User $user, FormRequest $formRequest): bool
    {
        return $formRequest->user_id === $user->id && $formRequest->status->isSubmittable();
    }

    // Own dept head reviews submitted requests
    public function review(User $user, FormRequest $formRequest): bool
    {
        if ($formRequest->user_id === $user->id) {
            return false;
        }

        if (! $user->hasPermission('form_requests.approve')) {
            return false;
        }

        if ($formRequest->status !== RequestStatus::Submitted) {
            return false;
        }

        return $user->isAdminLevel()
            || ($user->isDepartmentAdmin() && $formRequest->review_department_id === $user->department_id);
    }

    // Target dept head approves dept_approved requests
    public function targetDeptApprove(User $user, FormRequest $formRequest): bool
    {
        if ($formRequest->user_id === $user->id) {
            return false;
        }

        if (! $user->hasPermission('form_requests.approve')) {
            return false;
        }

        if ($formRequest->status !== RequestStatus::DeptApproved) {
            return false;
        }

        return $user->isAdminLevel()
            || ($user->isDepartmentAdmin() && $formRequest->target_department_id === $user->department_id);
    }

    // Section head approves at_section requests
    public function sectionApprove(User $user, FormRequest $formRequest): bool
    {
        if ($formRequest->user_id === $user->id) {
            return false;
        }

        if (! $user->hasPermission('form_requests.approve')) {
            return false;
        }

        if ($formRequest->status !== RequestStatus::AtSection) {
            return false;
        }

        return $user->isAdminLevel()
            || ($user->isSectionAdmin() && $formRequest->target_section_id === $user->section_id);
    }

    public function manageCc(User $user, FormRequest $formRequest): bool
    {
        if (! $user->isDepartmentAdmin() && ! $user->isAdminLevel()) {
            return false;
        }

        $activeStatuses = [
            RequestStatus::Submitted,
            RequestStatus::DeptApproved,
            RequestStatus::AtSection,
        ];

        if (! in_array($formRequest->status, $activeStatuses, true)) {
            return false;
        }

        return $user->isAdminLevel()
            || $formRequest->review_department_id === $user->department_id
            || $formRequest->target_department_id === $user->department_id;
    }

    public function forwardSection(User $user, FormRequest $formRequest): bool
    {
        if (! $user->hasPermission('form_requests.forward_section')) {
            return false;
        }

        return $formRequest->status === RequestStatus::DeptApproved
            && ($user->isAdminLevel()
                || ($user->isDepartmentAdmin() && $formRequest->target_department_id === $user->department_id));
    }
}
