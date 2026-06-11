<?php

namespace App\Http\Requests\FormRequest;

use App\Models\Section;
use App\Support\FormFieldValidator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateFormRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('form_request'));
    }

    public function rules(): array
    {
        return [
            'target_department_id' => ['sometimes', 'exists:departments,id'],
            'target_section_id' => ['nullable', 'exists:sections,id'],
            'data' => ['sometimes', 'array'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $formRequest = $this->route('form_request');
            $template = $formRequest->formTemplate;
            $deptId = $this->input('target_department_id', $formRequest->target_department_id);
            $sectionId = $this->has('target_section_id') ? $this->input('target_section_id') : $formRequest->target_section_id;

            if ($sectionId && ! Section::query()->where('id', $sectionId)->where('department_id', $deptId)->exists()) {
                $validator->errors()->add('target_section_id', 'Section must belong to the target department.');
            }

            if ($template?->target_section_id && $sectionId && (int) $template->target_section_id !== (int) $sectionId) {
                $validator->errors()->add('target_section_id', 'Target section does not match the form template.');
            }

            if (! $this->has('data') || ! $template) {
                return;
            }

            FormFieldValidator::validateData(
                $template->fields ?? [],
                $this->input('data', []),
                $validator
            );
        });
    }
}
