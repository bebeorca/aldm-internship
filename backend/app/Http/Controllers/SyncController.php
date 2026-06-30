<?php

namespace App\Http\Controllers;

use App\Http\Requests\SyncCsvRequest;
use App\Services\Sync\SyncCsvService;
use Illuminate\Http\JsonResponse;

class SyncController extends Controller
{
    public function __construct(
        private readonly SyncCsvService $syncCsvService,
    ) {}

    /**
     * POST /api/sync/csv
     * Parse file CSV dan return data peserta training
     */
    public function csv(SyncCsvRequest $request): JsonResponse
    {
        try {
            $result = $this->syncCsvService->handle(
                file:   $request->file('file'),
                userId: auth()->id(),
            );

            return response()->json([
                'code'    => 200,
                'success' => true,
                'message' => "Berhasil membaca {$result['jumlah']} data dari CSV.",
                'data'    => $result['data'],
                'meta'    => [
                    'jumlah'  => $result['jumlah'],
                    'log_id'  => $result['log_id'],
                ],
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data'    => [],
            ], 422);
        }
    }
}