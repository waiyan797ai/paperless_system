<?php

namespace App\Http\Requests\FormRequest;

use Illuminate\Foundation\Http\FormRequest;

class ForwardSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('forwardSection', $this->route('form_request'));
    }

    public function rules(): array
    {
        return [
            'target_section_id' => ['required', 'exists:sections,id'],
        ];
    }
}
