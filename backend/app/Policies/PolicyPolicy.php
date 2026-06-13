<?php

namespace App\Policies;

use App\Models\Policy;
use App\Models\User;

class PolicyPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Policy $policy): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdminLevel();
    }

    public function update(User $user, Policy $policy): bool
    {
        return $user->isAdminLevel();
    }

    public function delete(User $user, Policy $policy): bool
    {
        return $user->isAdminLevel();
    }
}
