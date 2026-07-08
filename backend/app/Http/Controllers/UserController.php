<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadSignatureRequest;
use App\Services\User\SignatureService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

class UserController extends Controller
{
    private SignatureService $signatureService;

    public function __construct(SignatureService $signatureService)
    {
        $this->signatureService = $signatureService;
    }

    /**
     * POST /api/user/signature
     * Hanya Direktur yang boleh upload tanda tangan
     */
    public function uploadSignature(UploadSignatureRequest $request): JsonResponse
    {
        if (Auth::user()?->role !== 'direktur') {
            return Response::json([
                'success' => false,
                'message' => 'Akses ditolak. Hanya Direktur yang dapat mengelola tanda tangan.',
            ], 403);
        }

        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $path = $this->signatureService->upload($user, $request->file('signature'));
            /** @var FilesystemAdapter $disk */
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
     * Hanya Direktur yang boleh lihat tanda tangannya sendiri
     */
    public function getSignature(): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::user();

        if (!$user) {
            return Response::json([
                'success' => false,
                'message' => 'Pengguna tidak ditemukan.',
            ], 401);
        }

        $signatureOwner = $user->role === 'direktur'
            ? $user
            : User::query()->where('role', 'direktur')->first();

        if (!$signatureOwner || !$signatureOwner->hasSignature()) {
            return Response::json([
                'success' => false,
                'message' => 'Tanda tangan belum diupload.',
                'data' => null,
            ]);
        }

        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        return Response::json([
            'success' => true,
            'data' => [
                'signature_path' => $signatureOwner->signature_path,
                'signature_url' => $disk->url($signatureOwner->signature_path),
            ],
        ]);
    }
}