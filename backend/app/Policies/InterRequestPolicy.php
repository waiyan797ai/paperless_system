<?php

namespace App\Policies;

use App\Enums\InterRequestStatus;
use App\Models\InterRequest;
use App\Models\User;

class InterRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, InterRequest $interRequest): bool
    {
        if ($user->isAdminLevel()) {
            return true;
        }

        if ($interRequest->requester_id === $user->id) {
            return true;
        }

        if ($interRequest->assigned_to === $user->id) {
            return true;
        }

        if ($interRequest->steps()
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)->orWhere('assigned_to_id', $user->id);
            })
            ->exists()) {
            return true;
        }

        return in_array($user->department_id, [
            $interRequest->from_department_id,
            $interRequest->to_department_id,
        ], true) && $user->isDepartmentAdmin();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function process(User $user, InterRequest $interRequest): bool
    {
        return $interRequest->assigned_to === $user->id
            && in_array($interRequest->status, [InterRequestStatus::Pending, InterRequestStatus::Processing], true);
    }

    public function update(User $user, InterRequest $interRequest): bool
    {
        return $user->isAdminLevel()
            || $interRequest->requester_id === $user->id
            || $interRequest->assigned_to === $user->id
            || ($user->isDepartmentAdmin() && $interRequest->to_department_id === $user->department_id);
    }

    public function delete(User $user, InterRequest $interRequest): bool
    {
        return $user->isAdminLevel() || $interRequest->requester_id === $user->id;
    }
}
