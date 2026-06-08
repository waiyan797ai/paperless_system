<?php

namespace App\Http\Requests\FormRequest;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignFormRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('assign', $this->route('form_request'));
    }

    public function rules(): array
    {
        $formRequest = $this->route('form_request');

        return [
            'assigned_to_id' => [
                'required',
                Rule::exists('users', 'id')->where(function ($query) use ($formRequest) {
                    $query->where('status', 'active');

                    if ($formRequest->status?->value === 'at_section' && $formRequest->target_section_id) {
                        $query->where('section_id', $formRequest->target_section_id);
                    } else {
                        $query->where('department_id', $formRequest->target_department_id);
                    }
                }),
            ],
            'remark' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'assigned_to_id.exists' => 'Selected user must be an active member of the target department.',
        ];
    }
}
