<?php

namespace App\Http\Requests\InterRequest;

use Illuminate\Foundation\Http\FormRequest;

class ApproveInterRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('process', $this->route('inter_request'));
    }

    public function rules(): array
    {
        return [
            'remark' => ['required', 'string', 'max:2000'],
        ];
    }
}
