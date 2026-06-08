<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

class DocumentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Document $document): bool
    {
        if ($user->isAdminLevel() || $document->uploaded_by === $user->id) {
            return true;
        }

        return $document->distributions()
            ->whereHas('recipients', fn ($q) => $q->where('department_id', $user->department_id))
            ->exists();
    }

    public function create(User $user): bool
    {
        return $user->isAdminLevel() || $user->isDepartmentHead();
    }

    public function update(User $user, Document $document): bool
    {
        return $user->isAdminLevel() || $document->uploaded_by === $user->id;
    }

    public function delete(User $user, Document $document): bool
    {
        return $user->isAdminLevel() || $document->uploaded_by === $user->id;
    }

    public function distribute(User $user, Document $document): bool
    {
        return $user->isAdminLevel() || $document->uploaded_by === $user->id;
    }
}
