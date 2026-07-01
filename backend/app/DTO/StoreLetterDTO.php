<?php

namespace App\DTO;

class StoreLetterDTO
{
    public function __construct(
        public readonly int $templateId,
        public readonly int $createdBy,
        public readonly array $dataSurat,
    ) {
    }

    public static function fromRequest(\Illuminate\Http\Request $request): self
    {
        return new self(
            templateId: (int) $request->input('template_id'),
            createdBy: (int) (auth()->id() ?? 1), // ← fallback ke user id 1 sementara
            dataSurat: $request->input('data_surat', []),
        );
    }
}