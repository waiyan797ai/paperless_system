<?php

namespace App\Http\Requests\Section;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdminLevel() || $this->user()->isDepartmentAdmin();
    }

    public function rules(): array
    {
        $section = $this->route('section');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('sections')->where(fn ($q) => $q->where('department_id', $section->department_id))->ignore($section),
            ],
            'department_id' => ['sometimes', 'exists:departments,id'],
            'parent_id' => ['nullable', 'exists:sections,id', 'not_in:'.$section->id],
            'head_id' => ['nullable', 'exists:users,id'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
