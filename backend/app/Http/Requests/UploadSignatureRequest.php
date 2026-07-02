<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadSignatureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'signature' => [
                'required',
                'image',
                'mimes:png,jpg,jpeg',
                'max:2048', // max 2MB
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'signature.required' => 'File tanda tangan wajib diupload.',
            'signature.image'    => 'File harus berupa gambar.',
            'signature.mimes'    => 'Format file harus PNG, JPG, atau JPEG.',
            'signature.max'      => 'Ukuran file maksimal 2MB.',
        ];
    }
}