<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\User::class);
    }

    public function rules(): array
    {
        return [
            'employee_id' => ['nullable', 'string', 'max:50', 'unique:users,employee_id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['required', Password::defaults()],
            'department_id' => ['nullable', 'exists:departments,id'],
            'section_id' => ['nullable', 'exists:sections,id'],
            'position' => ['nullable', 'string', 'max:255'],
            'approver_id' => ['nullable', 'exists:users,id'],
            'role_id' => ['required', 'exists:roles,id'],
            'status' => ['nullable', 'in:active,inactive,suspended'],
        ];
    }
}
