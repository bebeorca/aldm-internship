<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadSignatureRequest;
use App\Services\User\SignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
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
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $path = $this->signatureService->upload($user, $request->file('signature'));
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('public');

            return Response::json([
                'success' => true,
                'message' => 'Tanda tangan berhasil disimpan.',
                'data' => [
                    'signature_path' => $path,
                    'signature_url' => $disk->url($path),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Upload signature error', [
                'user_id' => Auth::id(),
                'message' => $e->getMessage(),
            ]);

            return Response::json([
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
        /** @var \App\Models\User $user */
        $user = Auth::user();
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        if (!$user->hasSignature()) {
            return Response::json([
                'success' => false,
                'message' => 'Tanda tangan belum diupload.',
                'data' => null,
            ]);
        }

        return Response::json([
            'success' => true,
            'data' => [
                'signature_path' => $user->signature_path,
                'signature_url' => $disk->url($user->signature_path),
            ],
        ]);
    }
}