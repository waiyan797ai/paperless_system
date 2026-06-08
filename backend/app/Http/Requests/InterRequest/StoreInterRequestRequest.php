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
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['nullable', 'in:low,normal,high,urgent'],
            'assigned_to' => ['required', 'integer', 'exists:users,id'],
            'remark' => ['nullable', 'string', 'max:2000'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'max:10240'],
        ];
    }

}
