<?php

namespace App\Policies;

use App\Models\Section;
use App\Models\User;

class SectionPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Section $section): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdminLevel();
    }

    public function update(User $user, Section $section): bool
    {
        return $user->isAdminLevel() || $section->head_id === $user->id;
    }

    public function delete(User $user, Section $section): bool
    {
        return $user->isAdminLevel();
    }
}
