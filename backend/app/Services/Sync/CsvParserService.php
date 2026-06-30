<?php

namespace App\Services\Sync;

use App\DTO\PesertaTrainingDTO;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;

class CsvParserService
{
    private const REQUIRED_COLUMNS = [
        'NO', 'NAMA', 'TEMPAT_LAHIR', 'TANGGAL_LAHIR', 'JENIS_KELAMIN',
        'NO_HP', 'ALAMAT', 'POSISI', 'GAJI', 'GAJI_TERBILANG',
        'TGL_MULAI_TRAINING', 'TGL_SELESAI_TRAINING', 'TGL_TTD',
    ];

    /**
     * Parse file CSV dan return koleksi DTO
     *
     * @return Collection<PesertaTrainingDTO>
     * @throws \InvalidArgumentException
     */
    public function parse(UploadedFile $file): Collection
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw new \InvalidArgumentException('File CSV tidak dapat dibaca.');
        }

        try {
            // Baca header
            $rawHeader = fgetcsv($handle, 0, ',');
            if ($rawHeader === false) {
                throw new \InvalidArgumentException('File CSV kosong.');
            }

            // Normalize header (trim + uppercase)
            $header = array_map(fn($h) => strtoupper(trim($h)), $rawHeader);

            // Validasi kolom
            $this->validateColumns($header);

            // Parse rows
            $rows = collect();
            $lineNumber = 2;

            while (($rawRow = fgetcsv($handle, 0, ',')) !== false) {
                // Skip baris kosong
                if (empty(array_filter($rawRow))) {
                    $lineNumber++;
                    continue;
                }

                $row = array_combine($header, $rawRow);
                $rows->push(PesertaTrainingDTO::fromRow($row));
                $lineNumber++;
            }

            if ($rows->isEmpty()) {
                throw new \InvalidArgumentException('File CSV tidak memiliki data.');
            }

            return $rows;

        } finally {
            fclose($handle);
        }
    }

    /**
     * Validasi header CSV sudah sesuai kolom yang dibutuhkan
     *
     * @throws \InvalidArgumentException
     */
    private function validateColumns(array $header): void
    {
        $missing = array_diff(self::REQUIRED_COLUMNS, $header);

        if (!empty($missing)) {
            throw new \InvalidArgumentException(
                'Kolom berikut tidak ditemukan di CSV: ' . implode(', ', $missing)
            );
        }
    }
}