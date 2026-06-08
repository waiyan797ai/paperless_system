<?php

namespace App\Http\Requests\FormRequest;

use Illuminate\Foundation\Http\FormRequest;

class ReturnFormRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        $formRequest = $this->route('form_request');

        return $this->user()->can('review', $formRequest)
            || $this->user()->can('process', $formRequest)
            || $this->user()->can('returnToSubmitter', $formRequest);
    }

    public function rules(): array
    {
        return [
            'comments' => ['required', 'string', 'max:1000'],
        ];
    }
}
