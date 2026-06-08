<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdminLevel() || $user->isDepartmentAdmin();
    }

    public function view(User $user, User $model): bool
    {
        if ($user->isAdminLevel() || $user->id === $model->id) {
            return true;
        }

        return $user->isDepartmentAdmin() && $model->department_id === $user->department_id;
    }

    public function create(User $user): bool
    {
        return $user->isAdminLevel();
    }

    public function update(User $user, User $model): bool
    {
        return $user->isAdminLevel() || $user->id === $model->id;
    }

    public function delete(User $user, User $model): bool
    {
        return $user->isAdminLevel() && $user->id !== $model->id;
    }
}
