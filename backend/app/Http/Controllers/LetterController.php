<?php

namespace App\Http\Controllers;

use App\DTO\StoreLetterDTO;
use App\Models\Letter;
use App\Services\Letter\DocxGeneratorService;
use App\Services\Letter\PdfConverterService;
use App\Services\Letter\StoreLetterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class LetterController extends Controller
{
    public function __construct(
        private readonly StoreLetterService $storeLetterService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user   = Auth::user();
        $status = $request->query('status');

        $query = Letter::with(['template', 'creator', 'latestApproval.reviewer'])
            ->orderBy('created_at', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        return response()->json([
            'success' => true,
            'data'    => $query->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $dto = StoreLetterDTO::fromRequest($request);

        try {
            $letter = $this->storeLetterService->handle($dto);
            return response()->json([
                'success' => true,
                'message' => 'Surat berhasil dibuat dan dikirim untuk persetujuan.',
                'data'    => $letter->load(['template', 'creator']),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            Log::error('Store letter error', ['message' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat file surat. Hubungi administrator.',
                'debug'   => $e->getMessage(),
            ], 500);
        }
    }

    public function show(Request $request, Letter $letter): JsonResponse
    {
        // Bug 5 fix: hapus restriction — semua role boleh lihat semua surat
        // (konsisten dengan index() yang tidak memfilter by role)
        return response()->json([
            'success' => true,
            'data'    => $letter->load(['template', 'creator', 'latestApproval.reviewer']),
        ]);
    }

    /**
     * GET /api/letters/{letter}/pdf-view (tanpa auth)
     * Bug 2 fix: serve PDF letter untuk ditampilkan di iframe pada detail page.
     * Konversi DOCX → PDF via LibreOffice jika belum ada.
     */
    public function pdfView(Letter $letter): \Symfony\Component\HttpFoundation\Response
    {
        if (!$letter->path_docx) {
            abort(404, 'File surat tidak tersedia.');
        }

        // Generate PDF jika belum ada
        if (!$letter->path_pdf || !Storage::disk('public')->exists($letter->path_pdf)) {
            try {
                $pdfPath = app(PdfConverterService::class)->convert($letter->path_docx);
                $letter->updateQuietly(['path_pdf' => $pdfPath]);
            } catch (\RuntimeException $e) {
                Log::error('pdfView conversion failed', ['letter_id' => $letter->id, 'error' => $e->getMessage()]);
                abort(500, 'Gagal mengkonversi dokumen ke PDF.');
            }
        }

        $fullPath = Storage::disk('public')->path($letter->path_pdf);

        if (!file_exists($fullPath)) {
            abort(404, 'File PDF tidak ditemukan.');
        }

        return response()->file($fullPath, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="surat.pdf"',
        ]);
    }

    /**
     * GET /api/letters/{letter}/export?format=pdf|docx
     * Bug 5 fix: generate PDF jika belum ada, lalu download.
     */
    public function export(Request $request, Letter $letter): \Symfony\Component\HttpFoundation\Response|JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        if (!$letter->canExport()) {
            return response()->json([
                'success' => false,
                'message' => 'Surat belum disetujui.',
            ], 403);
        }

        $format = strtolower((string) $request->input('format', 'pdf'));

        if ($format === 'docx') {
            if (!$letter->path_docx) {
                return response()->json(['success' => false, 'message' => 'File DOCX tidak tersedia.'], 404);
            }
            $fullPath = Storage::disk('public')->path($letter->path_docx);
            if (!file_exists($fullPath)) {
                return response()->json(['success' => false, 'message' => 'File DOCX tidak ditemukan.'], 404);
            }
            return response()->download($fullPath, ($letter->nomor_surat ?? 'surat') . '.docx');
        }

        // PDF export
        if (!$letter->path_docx) {
            return response()->json(['success' => false, 'message' => 'File sumber tidak tersedia.'], 404);
        }

        // Generate PDF jika belum ada (sama dengan pdfView)
        if (!$letter->path_pdf || !Storage::disk('public')->exists($letter->path_pdf)) {
            try {
                $pdfPath = app(PdfConverterService::class)->convert($letter->path_docx);
                $letter->updateQuietly(['path_pdf' => $pdfPath]);
            } catch (\RuntimeException $e) {
                return response()->json(['success' => false, 'message' => 'Gagal membuat PDF: ' . $e->getMessage()], 500);
            }
        }

        $fullPath = Storage::disk('public')->path($letter->path_pdf);
        if (!file_exists($fullPath)) {
            return response()->json(['success' => false, 'message' => 'File PDF tidak ditemukan.'], 404);
        }

        return response()->download($fullPath, ($letter->nomor_surat ?? 'surat') . '.pdf', [
            'Content-Type' => 'application/pdf',
        ]);
    }

    public function approve(Request $request, Letter $letter): JsonResponse
    {
        // Implementasi approval oleh Toni — jangan diubah
        abort(501, 'Not implemented in this branch.');
    }

    public function reject(Request $request, Letter $letter): JsonResponse
    {
        // Implementasi reject oleh Toni — jangan diubah
        abort(501, 'Not implemented in this branch.');
    }
}