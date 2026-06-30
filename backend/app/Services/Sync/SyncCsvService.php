<?php

namespace App\Services\Sync;

use App\DTO\PesertaTrainingDTO;
use App\Models\SyncLog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SyncCsvService
{
    public function __construct(
        private readonly CsvParserService $parser,
    ) {}

    /**
     * Proses upload CSV, parse, simpan log, return data
     *
     * @return array{data: array, jumlah: int, log_id: int}
     * @throws \Throwable
     */
    public function handle(UploadedFile $file, int $userId): array
    {
        return DB::transaction(function () use ($file, $userId) {
            try {
                // Parse CSV → Collection<PesertaTrainingDTO>
                $rows = $this->parser->parse($file);

                // Simpan log sukses
                $log = SyncLog::create([
                    'user_id'      => $userId,
                    'tipe'         => 'csv',
                    'nama_file'    => $file->getClientOriginalName(),
                    'jumlah_data'  => $rows->count(),
                    'status'       => 'success',
                    'pesan_error'  => null,
                ]);

                return [
                    'data'    => $rows->map(fn(PesertaTrainingDTO $dto) => $dto->toArray())->values()->all(),
                    'jumlah'  => $rows->count(),
                    'log_id'  => $log->id,
                ];

            } catch (\InvalidArgumentException $e) {
                // Simpan log gagal
                SyncLog::create([
                    'user_id'     => $userId,
                    'tipe'        => 'csv',
                    'nama_file'   => $file->getClientOriginalName(),
                    'jumlah_data' => 0,
                    'status'      => 'failed',
                    'pesan_error' => $e->getMessage(),
                ]);

                throw $e;
            }
        });
    }
}