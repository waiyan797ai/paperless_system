<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;

class DistributeDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('distribute', $this->route('document'));
    }

    public function rules(): array
    {
        return [
            'department_ids' => ['required', 'array', 'min:1'],
            'department_ids.*' => ['exists:departments,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
