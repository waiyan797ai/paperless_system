<?php

namespace App\Http\Requests\DocumentType;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user->isAdminLevel() || $user->isDepartmentAdmin();
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'unique:document_types,code'],
            'title' => ['required', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
