<?php

namespace App\Http\Requests\PolicyType;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePolicyTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdminLevel();
    }

    public function rules(): array
    {
        $policyTypeId = $this->route('policy_type')?->id ?? $this->route('policy_type');

        return [
            'code' => ['sometimes', 'string', 'max:50', 'alpha_dash', Rule::unique('policy_types', 'code')->ignore($policyTypeId)],
            'title' => ['sometimes', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
