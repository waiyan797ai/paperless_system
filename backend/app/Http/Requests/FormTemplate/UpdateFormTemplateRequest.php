<?php

namespace App\Http\Requests\FormTemplate;

use App\Models\Section;
use App\Support\FormFieldValidator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFormTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdminLevel();
    }

    public function rules(): array
    {
        $templateId = $this->route('form_template')?->id ?? $this->route('form_template');

        return [
            'code' => ['sometimes', 'string', 'max:50', 'alpha_dash', Rule::unique('form_templates', 'code')->ignore($templateId)],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'target_department_id' => ['nullable', 'exists:departments,id'],
            'target_section_id' => ['nullable', 'exists:sections,id'],
            'status' => ['nullable', 'in:active,inactive'],
            'fields' => ['sometimes', 'array', 'min:1'],
            'fields.*.name' => ['required_with:fields', 'string', 'max:100'],
            'fields.*.label' => ['required_with:fields', 'string', 'max:255'],
            'fields.*.type' => ['required_with:fields', 'in:text,textarea,number,date,select,items'],
            'fields.*.required' => ['boolean'],
            'fields.*.options' => ['nullable', 'array'],
            'fields.*.options.*' => ['string', 'max:255'],
            'fields.*.columns' => ['nullable', 'array'],
            'fields.*.columns.*.name' => ['required_with:fields.*.columns', 'string', 'max:100'],
            'fields.*.columns.*.label' => ['required_with:fields.*.columns', 'string', 'max:255'],
            'fields.*.columns.*.type' => ['required_with:fields.*.columns', 'in:text,number,date,select'],
            'fields.*.columns.*.required' => ['boolean'],
            'fields.*.columns.*.options' => ['nullable', 'array'],
            'fields.*.columns.*.options.*' => ['string', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $deptId = $this->input('target_department_id');
            $sectionId = $this->input('target_section_id');

            if ($sectionId && ! $deptId) {
                $validator->errors()->add('target_section_id', 'Department is required when a section is selected.');
            }

            if ($sectionId && $deptId && ! Section::query()->where('id', $sectionId)->where('department_id', $deptId)->exists()) {
                $validator->errors()->add('target_section_id', 'Section must belong to the selected department.');
            }

            if ($this->has('fields')) {
                FormFieldValidator::validateTemplateFields($this->input('fields', []), $validator);
            }
        });
    }
}
