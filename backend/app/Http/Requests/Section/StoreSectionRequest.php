<?php

namespace App\Http\Requests\Section;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdminLevel() || $this->user()->isDepartmentAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('sections')->where(fn ($q) => $q->where('department_id', $this->department_id)),
            ],
            'department_id' => ['required', 'exists:departments,id'],
            'parent_id' => ['nullable', 'exists:sections,id'],
            'head_id' => ['nullable', 'exists:users,id'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
