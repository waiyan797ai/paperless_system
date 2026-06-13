<?php

namespace App\Policies;

use App\Models\FormTemplate;
use App\Models\User;

class FormTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, FormTemplate $formTemplate): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdminLevel();
    }

    public function update(User $user, FormTemplate $formTemplate): bool
    {
        return $user->isAdminLevel();
    }

    public function delete(User $user, FormTemplate $formTemplate): bool
    {
        return $user->isAdminLevel();
    }
}
