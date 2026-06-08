<?php

namespace App\Http\Requests\PolicyType;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePolicyTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdminLevel();
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('policy_types', 'code')],
            'title' => ['required', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
