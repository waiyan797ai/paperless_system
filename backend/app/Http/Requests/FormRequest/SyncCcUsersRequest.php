<?php

namespace App\Http\Requests\FormRequest;

use Illuminate\Foundation\Http\FormRequest;

class SyncCcUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageCc', $this->route('form_request'));
    }

    public function rules(): array
    {
        return [
            'user_ids' => ['present', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ];
    }
}
