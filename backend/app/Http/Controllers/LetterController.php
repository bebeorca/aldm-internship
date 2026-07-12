<?php

namespace App\Http\Controllers;

use App\DTO\StoreLetterDTO;
use App\Http\Requests\StoreLetterRequest;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\Letter\StoreLetterService;
use App\Services\Letter\PdfConverterService;
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
    public function show(Request $request, Letter $letter): LetterResource
    {
        $user = $request->user();

        // Pembuat hanya boleh lihat suratnya sendiri
        if ($user && $user->role === 'pembuat' && $letter->created_by !== $user->id) {
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

        if (!$user->hasSignature()) {
            return response()->json([
                'success' => false,
                'message' => 'Tanda tangan digital belum tersedia. Upload tanda tangan terlebih dahulu sebelum menyetujui surat.',
            ], 422);
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
        $action = strtolower(trim((string) $request->input('action', 'permanent')));

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

        $allowedActions = ['revision', 'permanent'];
        if (!in_array($action, $allowedActions, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Aksi penolakan tidak valid.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($letter, $user, $catatan, $action) {
                $letter->update([
                    // gunakan status khusus "revision" agar bisa dibedakan dari "draft"
                    'status' => $action === 'revision' ? 'revision' : 'rejected',
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
            // Jika ada file lampiran, simpan ke disk public dan masukkan ke data_surat
            if ($request->hasFile('attachment')) {
                try {
                    $file = $request->file('attachment');
                    $originalName = $file->getClientOriginalName();
                    $uploaded = $file->store('letters/attachments', 'public');
                    $existing = $request->input('data_surat', []);
                    if (is_string($existing)) {
                        $decoded = json_decode($existing, true);
                        $existing = is_array($decoded) ? $decoded : [];
                    }
                    $existing['lampiran'] = $originalName;
                    $existing['lampiran_path'] = $uploaded;
                    // merge back into request so DTO picks it up
                    $request->merge(['data_surat' => $existing]);
                } catch (\Throwable $e) {
                    Log::error('Failed to store attachment', ['message' => $e->getMessage()]);
                }
            }

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

    /**
 * GET /api/letters/:id/export?format=pdf|docx
 */
public function export(Request $request, Letter $letter)
{
    $user = $request->user();
    if (!$user) {
        return response()->json(['success' => false, 'message' => 'Unauthorized.'], 401);
    }

    if (!$letter->canExport()) {
        return response()->json([
            'success' => false,
            'message' => 'Surat belum disetujui untuk diekspor.',
        ], 403);
    }

    $format = strtolower(trim((string) $request->input('format', 'pdf')));
    if (!in_array($format, ['pdf', 'docx'], true)) {
        return response()->json(['success' => false, 'message' => 'Format tidak valid.'], 422);
    }

    // ─── Export DOCX ────────────────────────────────────────────────────────
    if ($format === 'docx') {
        if (!$letter->path_docx) {
            return response()->json(['success' => false, 'message' => 'File DOCX tidak tersedia.'], 404);
        }
        $fullPath = storage_path('app/public/' . ltrim($letter->path_docx, '/'));
        if (!file_exists($fullPath)) {
            return response()->json(['success' => false, 'message' => 'File DOCX tidak ditemukan di server.'], 404);
        }
        return response()->download($fullPath, ($letter->nomor_surat ?: 'surat') . '.docx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
    }

    // ─── Export PDF ─────────────────────────────────────────────────────────
    // Cek apakah PDF sudah pernah dibuat
    if ($letter->path_pdf) {
        $existingPdf = storage_path('app/public/' . ltrim($letter->path_pdf, '/'));
        if (file_exists($existingPdf)) {
            return response()->download($existingPdf, ($letter->nomor_surat ?: 'surat') . '.pdf', [
                'Content-Type' => 'application/pdf',
            ]);
        }
    }

    // Belum ada PDF → konversi DOCX ke PDF via LibreOffice
    if (!$letter->path_docx) {
        return response()->json(['success' => false, 'message' => 'File DOCX sumber tidak tersedia.'], 404);
    }

    try {
        $pdfConverter = app(PdfConverterService::class);
        $pdfPath      = $pdfConverter->convert($letter->path_docx);

        // Simpan path PDF agar tidak perlu konversi ulang
        $letter->update(['path_pdf' => $pdfPath]);

        $fullPath = storage_path('app/public/' . $pdfPath);
        return response()->download($fullPath, ($letter->nomor_surat ?: 'surat') . '.pdf', [
            'Content-Type' => 'application/pdf',
        ]);

    } catch (\RuntimeException $e) {
        Log::error('PDF export failed', ['letter_id' => $letter->id, 'message' => $e->getMessage()]);
        return response()->json(['success' => false, 'message' => 'Gagal membuat PDF: ' . $e->getMessage()], 500);
    }
}
}