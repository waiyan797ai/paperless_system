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
            || $user->hasPermission('form_requests.process');
    }

    public function view(User $user, FormRequest $formRequest): bool
    {
        if ($user->isAdminLevel()) {
            return true;
        }

        if ($formRequest->user_id === $user->id) {
            return true;
        }

        if ($formRequest->assigned_to_id === $user->id) {
            return true;
        }

        if ($formRequest->ccUsers()->where('users.id', $user->id)->exists()) {
            return true;
        }

        if ($user->hasPermission('form_requests.dept_inbox')) {
            if ($formRequest->status === RequestStatus::Submitted
                && $formRequest->review_department_id === $user->department_id) {
                return true;
            }

            if ($formRequest->status === RequestStatus::DeptApproved
                && $formRequest->target_department_id === $user->department_id) {
                return true;
            }

            // After assignment, keep department admin view access in the same target department scope.
            if ($formRequest->status === RequestStatus::Assigned
                && $formRequest->target_department_id === $user->department_id) {
                return true;
            }
        }

        if ($user->hasPermission('form_requests.section_inbox')
            && $formRequest->target_section_id === $user->section_id) {
            // Section inbox stages
            if ($formRequest->status === RequestStatus::AtSection) {
                return true;
            }

            // Assigned requests created from section stage
            if ($formRequest->status === RequestStatus::Assigned) {
                return true;
            }
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
        return $formRequest->user_id === $user->id
            && $formRequest->status === RequestStatus::Draft;
    }

    public function submit(User $user, FormRequest $formRequest): bool
    {
        return $formRequest->user_id === $user->id && $formRequest->status->isSubmittable();
    }

    public function review(User $user, FormRequest $formRequest): bool
    {
        if ($formRequest->user_id === $user->id) {
            return false;
        }

        if (! $user->hasPermission('form_requests.approve')) {
            return false;
        }

        return $formRequest->status === RequestStatus::Submitted
            && $formRequest->review_department_id === $user->department_id
            && ($user->isAdminLevel() || $user->isDepartmentAdmin());
    }

    public function manageCc(User $user, FormRequest $formRequest): bool
    {
        if (! $user->isDepartmentAdmin() && ! $user->isAdminLevel()) {
            return false;
        }

        if ($formRequest->status === RequestStatus::Submitted
            && $formRequest->review_department_id === $user->department_id) {
            return true;
        }

        return $formRequest->status === RequestStatus::DeptApproved
            && $formRequest->target_department_id === $user->department_id;
    }

    public function assign(User $user, FormRequest $formRequest): bool
    {
        if (! $user->hasPermission('form_requests.assign')) {
            return false;
        }

        if ($formRequest->status === RequestStatus::DeptApproved) {
            return $user->isAdminLevel()
                || ($user->isDepartmentAdmin() && $formRequest->target_department_id === $user->department_id);
        }

        if ($formRequest->status === RequestStatus::AtSection) {
            return $user->isAdminLevel()
                || ($user->isSectionAdmin() && $formRequest->target_section_id === $user->section_id);
        }

        return false;
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

    public function returnToSubmitter(User $user, FormRequest $formRequest): bool
    {
        if ($formRequest->user_id === $user->id) {
            return false;
        }

        if (! $user->hasPermission('form_requests.approve')) {
            return false;
        }

        return $formRequest->status === RequestStatus::DeptApproved
            && ($user->isAdminLevel()
                || ($user->isDepartmentAdmin() && $formRequest->target_department_id === $user->department_id));
    }

    public function process(User $user, FormRequest $formRequest): bool
    {
        if ($formRequest->user_id === $user->id) {
            return false;
        }

        if (! $user->hasPermission('form_requests.process') && ! $user->hasPermission('form_requests.approve')) {
            return false;
        }

        return $formRequest->assigned_to_id === $user->id
            && $formRequest->status === RequestStatus::Assigned;
    }
}
