<?php

namespace App\Http\Controllers;

use App\DTO\StoreLetterDTO;
use App\Http\Requests\StoreLetterRequest;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\Letter\StoreLetterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LetterController extends Controller
{
    public function __construct(
        private readonly StoreLetterService $storeLetterService,
    ) {
    }

    /**
     * GET /api/letters
     * Ambil semua surat (filter by status & role)
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = Auth::user();

        $query = Letter::with(['template', 'creator', 'latestApproval.reviewer'])
            ->latest();

        // Pembuat hanya lihat suratnya sendiri
        // if ($user->role === 'pembuat') {
        //     $query->ownedBy($user->id);
        // }

        // Filter by status (opsional)
        if ($request->filled('status')) {
            $query->byStatus($request->input('status'));
        }

        $letters = $query->paginate(15);

        return LetterResource::collection($letters);
    }

    /**
     * GET /api/letters/:id
     * Detail satu surat
     */
    public function show(Letter $letter): LetterResource
    {
        $user = Auth::user();

        // Pembuat hanya boleh lihat suratnya sendiri
        if ($user->role === 'pembuat' && $letter->created_by !== $user->id) {
            abort(403, 'Anda tidak memiliki akses ke surat ini.');
        }

        $letter->load(['template', 'creator', 'latestApproval.reviewer']);

        return new LetterResource($letter);
    }

    /**
     * PATCH /api/letters/:id/approve
     * Setujui surat yang sedang menunggu approval
     */
    public function approve(Request $request, Letter $letter): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->isDirektur() && !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses untuk menyetujui surat.',
            ], 403);
        }

        if (!$letter->isPending()) {
            return response()->json([
                'success' => false,
                'message' => 'Surat ini tidak sedang menunggu approval.',
            ], 409);
        }

        try {
            DB::transaction(function () use ($letter, $user, $request) {
                $letter->update([
                    'status' => 'approved',
                    'catatan_reject' => null,
                ]);

                $letter->approvals()->create([
                    'reviewed_by' => $user->id,
                    'status' => 'approved',
                    'catatan' => $request->input('catatan'),
                    'reviewed_at' => now(),
                ]);
            });

            $letter->load(['template', 'creator', 'latestApproval.reviewer']);

            return response()->json([
                'success' => true,
                'message' => 'Surat berhasil disetujui.',
                'data' => new LetterResource($letter),
            ]);
        } catch (\Throwable $e) {
            Log::error('LetterController approve error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyetujui surat.',
            ], 500);
        }
    }

    /**
     * PATCH /api/letters/:id/reject
     * Tolak surat yang sedang menunggu approval
     */
    public function reject(Request $request, Letter $letter): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->isDirektur() && !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses untuk menolak surat.',
            ], 403);
        }

        $catatan = trim((string) $request->input('catatan', ''));

        if ($catatan === '') {
            return response()->json([
                'success' => false,
                'message' => 'Catatan wajib diisi saat menolak surat.',
            ], 422);
        }

        if (!$letter->isPending()) {
            return response()->json([
                'success' => false,
                'message' => 'Surat ini tidak sedang menunggu approval.',
            ], 409);
        }

        try {
            DB::transaction(function () use ($letter, $user, $catatan) {
                $letter->update([
                    'status' => 'rejected',
                    'catatan_reject' => $catatan,
                ]);

                $letter->approvals()->create([
                    'reviewed_by' => $user->id,
                    'status' => 'rejected',
                    'catatan' => $catatan,
                    'reviewed_at' => now(),
                ]);
            });

            $letter->load(['template', 'creator', 'latestApproval.reviewer']);

            return response()->json([
                'success' => true,
                'message' => 'Surat berhasil ditolak.',
                'data' => new LetterResource($letter),
            ]);
        } catch (\Throwable $e) {
            Log::error('LetterController reject error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menolak surat.',
            ], 500);
        }
    }

    /**
     * POST /api/letters
     * Buat surat baru dan kirim ke approval
     */
    public function store(StoreLetterRequest $request): JsonResponse
    {
        try {
            $dto = StoreLetterDTO::fromRequest($request);
            $letter = $this->storeLetterService->handle($dto);

            $letter->load(['template', 'creator']);

            return response()->json([
                'success' => true,
                'message' => 'Surat berhasil dikirim untuk approval.',
                'data' => new LetterResource($letter),
            ], 201);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);

        } catch (\RuntimeException $e) {
            Log::error('LetterController store error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat file surat. Hubungi administrator.',
                'debug' => $e->getMessage(), // ← tambah ini sementara
            ], 500);
        }
    }
}