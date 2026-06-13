<?php

namespace App\Policies;

use App\Models\DocumentType;
use App\Models\User;

class DocumentTypePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DocumentType $documentType): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdminLevel();
    }

    public function update(User $user, DocumentType $documentType): bool
    {
        return $user->isAdminLevel();
    }

    public function delete(User $user, DocumentType $documentType): bool
    {
        return $user->isAdminLevel();
    }
}
