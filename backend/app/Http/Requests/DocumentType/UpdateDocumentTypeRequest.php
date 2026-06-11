<?php

namespace App\Http\Requests\DocumentType;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDocumentTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user->isAdminLevel() || $user->isDepartmentAdmin();
    }

    public function rules(): array
    {
        $documentType = $this->route('document_type');

        return [
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('document_types', 'code')->ignore($documentType?->id)],
            'title' => ['sometimes', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
