<?php

namespace App\Http\Requests\InterRequest;

use Illuminate\Foundation\Http\FormRequest;

class StoreInterRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\InterRequest::class);
    }

    public function rules(): array
    {
        return [
            'to_department_id' => ['required', 'exists:departments,id', 'different:from_department_id'],
            'from_department_id' => ['nullable', 'exists:departments,id'],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['nullable', 'in:low,normal,high,urgent'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'max:10240'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->from_department_id) {
            $this->merge(['from_department_id' => $this->user()->department_id]);
        }
    }
}
