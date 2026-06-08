<?php

namespace App\Http\Requests\FormRequest;

use App\Models\FormTemplate;
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
            'data' => ['sometimes', 'array'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (! $this->has('data')) {
                return;
            }

            $formRequest = $this->route('form_request');
            $template = $formRequest->formTemplate;

            if (! $template) {
                return;
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
