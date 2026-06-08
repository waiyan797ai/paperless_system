<?php

namespace App\Http\Requests\FormTemplate;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFormTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdminLevel();
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('form_templates', 'code')],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'target_department_id' => ['nullable', 'exists:departments,id'],
            'status' => ['nullable', 'in:active,inactive'],
            'fields' => ['required', 'array', 'min:1'],
            'fields.*.name' => ['required', 'string', 'max:100'],
            'fields.*.label' => ['required', 'string', 'max:255'],
            'fields.*.type' => ['required', 'in:text,textarea,number,date,select'],
            'fields.*.required' => ['boolean'],
            'fields.*.options' => ['nullable', 'array'],
            'fields.*.options.*' => ['string', 'max:255'],
        ];
    }
}
