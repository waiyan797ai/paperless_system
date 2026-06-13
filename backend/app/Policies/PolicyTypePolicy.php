<?php

namespace App\Policies;

use App\Models\PolicyType;
use App\Models\User;

class PolicyTypePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, PolicyType $policyType): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdminLevel();
    }

    public function update(User $user, PolicyType $policyType): bool
    {
        return $user->isAdminLevel();
    }

    public function delete(User $user, PolicyType $policyType): bool
    {
        return $user->isAdminLevel();
    }
}
