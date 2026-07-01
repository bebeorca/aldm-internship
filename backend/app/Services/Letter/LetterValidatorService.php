<?php

namespace App\Services\Letter;

use App\Models\Template;

class LetterValidatorService
{
    /**
     * Validasi data_surat sudah memenuhi semua variabel yang dibutuhkan template
     *
     * @throws \InvalidArgumentException
     */
    public function validate(Template $template, array $dataSurat): void
    {
        $requiredVariables = $template->variabel; // sudah di-cast ke array di model
        $missing = [];

        foreach ($requiredVariables as $variable) {
            if (empty(trim($dataSurat[$variable] ?? ''))) {
                $missing[] = $variable;
            }
        }

        if (!empty($missing)) {
            throw new \InvalidArgumentException(
                'Field berikut wajib diisi: ' . implode(', ', $missing)
            );
        }
    }
}