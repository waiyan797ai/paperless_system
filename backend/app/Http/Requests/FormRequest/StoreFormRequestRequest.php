<?php

namespace App\Http\Requests\FormRequest;

use App\Models\FormTemplate;
use App\Models\Section;
use App\Support\FormFieldValidator;
use Illuminate\Foundation\Http\FormRequest;

class StoreFormRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\FormRequest::class);
    }

    public function rules(): array
    {
        return [
            'form_template_id' => ['required', 'exists:form_templates,id'],
            'target_department_id' => ['required', 'exists:departments,id'],
            'target_section_id' => ['nullable', 'exists:sections,id'],
            'data' => ['required', 'array'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $template = FormTemplate::find($this->form_template_id);

            if (! $template || $template->status !== 'active') {
                $validator->errors()->add('form_template_id', 'Selected form template is not available.');

                return;
            }

            if ($template->target_department_id && (int) $template->target_department_id !== (int) $this->target_department_id) {
                $validator->errors()->add('target_department_id', 'Target department does not match the form template.');
            }

            $sectionId = $this->input('target_section_id');
            if ($sectionId && ! Section::query()->where('id', $sectionId)->where('department_id', $this->target_department_id)->exists()) {
                $validator->errors()->add('target_section_id', 'Section must belong to the target department.');
            }

            if ($template->target_section_id && $sectionId && (int) $template->target_section_id !== (int) $sectionId) {
                $validator->errors()->add('target_section_id', 'Target section does not match the form template.');
            }

            FormFieldValidator::validateData(
                $template->fields ?? [],
                $this->input('data', []),
                $validator
            );
        });
    }
}
