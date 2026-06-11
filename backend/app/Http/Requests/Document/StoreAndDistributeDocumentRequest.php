<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;

class StoreAndDistributeDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user->isAdminLevel() || $user->isDepartmentHead();
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'document_type_id' => ['required', 'exists:document_types,id'],
            'version' => ['nullable', 'string', 'max:20'],
            'file' => ['required', 'file', 'max:30720'],
            'department_ids' => ['required', 'array', 'min:1'],
            'department_ids.*' => ['exists:departments,id'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Please attach a document file.',
            'file.file' => 'The uploaded file is invalid.',
            'file.max' => 'The file may not be larger than 30 MB.',
            'file.uploaded' => 'The file failed to upload. Stop the backend and restart with: cd backend && ./serve.sh',
            'department_ids.required' => 'Select at least one department.',
            'title.required' => 'Document title is required.',
        ];
    }
}
