<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadSignatureRequest;
use App\Services\User\SignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function __construct(
        private readonly SignatureService $signatureService,
    ) {
    }

    /**
     * POST /api/user/signature
     * Upload dan simpan foto tanda tangan direktur
     */
    public function uploadSignature(UploadSignatureRequest $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $path = $this->signatureService->upload($user, $request->file('signature'));

            return response()->json([
                'success' => true,
                'message' => 'Tanda tangan berhasil disimpan.',
                'data' => [
                    'signature_path' => $path,
                    'signature_url' => Storage::disk('public')->url($path),
                ],
            ]);

        } catch (\Exception $e) {
            \Log::error('Upload signature error', [
                'user_id' => auth()->id(),
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan tanda tangan.',
            ], 500);
        }
    }

    /**
     * GET /api/user/signature
     * Ambil info tanda tangan user yang sedang login
     */
    public function getSignature(): JsonResponse
    {
        $user = auth()->user();

        if (!$user->hasSignature()) {
            return response()->json([
                'success' => false,
                'message' => 'Tanda tangan belum diupload.',
                'data' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'signature_path' => $user->signature_path,
                'signature_url' => Storage::disk('public')->url($user->signature_path),
            ],
        ]);
    }
}