<?php

namespace App\Http\Requests\Policy;

use Illuminate\Foundation\Http\FormRequest;

class StorePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdminLevel();
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
            'file' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
        ];
    }
}
