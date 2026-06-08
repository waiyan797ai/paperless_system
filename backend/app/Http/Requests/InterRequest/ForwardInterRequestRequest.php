<?php

namespace App\Http\Requests\InterRequest;

use Illuminate\Foundation\Http\FormRequest;

class ForwardInterRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('process', $this->route('inter_request'));
    }

    public function rules(): array
    {
        return [
            'assigned_to' => ['required', 'integer', 'exists:users,id', 'different:user_id'],
            'remark' => ['required', 'string', 'max:2000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['user_id' => $this->user()->id]);
    }
}
