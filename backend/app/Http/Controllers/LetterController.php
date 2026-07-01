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
        $user = auth()->user();

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
        $user = auth()->user();

        // Pembuat hanya boleh lihat suratnya sendiri
        if ($user->role === 'pembuat' && $letter->created_by !== $user->id) {
            abort(403, 'Anda tidak memiliki akses ke surat ini.');
        }

        $letter->load(['template', 'creator', 'latestApproval.reviewer']);

        return new LetterResource($letter);
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
            \Log::error('LetterController store error', [
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