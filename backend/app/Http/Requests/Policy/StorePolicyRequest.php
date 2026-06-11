<?php

namespace App\Http\Requests\Policy;

use Illuminate\Foundation\Http\FormRequest;

class StorePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('policies.manage');
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'policy_type_id' => ['required', 'exists:policy_types,id'],
            'version' => ['nullable', 'string', 'max:20'],
            'effective_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:active,inactive,archived'],
            'approved_by' => ['nullable', 'string', 'max:255'],
            'file' => ['nullable', 'file', 'mimes:pdf', 'max:30720'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.file' => 'The uploaded file is invalid.',
            'file.mimes' => 'Only PDF files are allowed.',
            'file.max' => 'The PDF may not be larger than 30 MB.',
            'file.uploaded' => 'The file failed to upload. It may exceed the server limit (2 MB by default). Restart the backend with: cd backend && ./serve.sh',
        ];
    }
}
