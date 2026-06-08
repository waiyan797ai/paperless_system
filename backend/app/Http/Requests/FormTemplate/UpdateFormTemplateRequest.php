<?php

namespace App\Http\Requests\FormTemplate;

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
            'status' => ['nullable', 'in:active,inactive'],
            'fields' => ['sometimes', 'array', 'min:1'],
            'fields.*.name' => ['required_with:fields', 'string', 'max:100'],
            'fields.*.label' => ['required_with:fields', 'string', 'max:255'],
            'fields.*.type' => ['required_with:fields', 'in:text,textarea,number,date,select'],
            'fields.*.required' => ['boolean'],
            'fields.*.options' => ['nullable', 'array'],
            'fields.*.options.*' => ['string', 'max:255'],
        ];
    }
}
