<?php

namespace App\DTO;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StoreLetterDTO
{
    public function __construct(
        public readonly int $templateId,
        public readonly int $createdBy,
        public readonly array $dataSurat,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        $createdBy = Auth::id();

        if (!$createdBy) {
            throw new \InvalidArgumentException('Pengguna belum login. Silakan masuk kembali.');
        }

        $dataSurat = $request->input('data_surat', []);
        // Accept JSON string when sent via multipart/form-data
        if (is_string($dataSurat)) {
            $decoded = json_decode($dataSurat, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $dataSurat = $decoded;
            } else {
                $dataSurat = [];
            }
        }

        return new self(
            templateId: (int) $request->input('template_id'),
            createdBy: $createdBy,
            dataSurat: $dataSurat,
        );
    }
}