<?php

namespace App\Http\Requests\FormRequest;

use Illuminate\Foundation\Http\FormRequest;

class RejectFormRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        $formRequest = $this->route('form_request');

        return $this->user()->can('review', $formRequest)
            || $this->user()->can('targetDeptApprove', $formRequest)
            || $this->user()->can('sectionApprove', $formRequest);
    }

    public function rules(): array
    {
        return [
            'comments' => ['required', 'string', 'max:1000'],
        ];
    }
}
