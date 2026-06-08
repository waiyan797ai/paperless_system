<?php

namespace App\Http\Requests\FormRequest;

use App\Models\FormTemplate;
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

            foreach ($template->fields ?? [] as $field) {
                $name = $field['name'] ?? null;
                $value = $this->input("data.{$name}");

                if (($field['required'] ?? false) && ($value === null || $value === '')) {
                    $validator->errors()->add("data.{$name}", ($field['label'] ?? $name).' is required.');
                }
            }
        });
    }
}
