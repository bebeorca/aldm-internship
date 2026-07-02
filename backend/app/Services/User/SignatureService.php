<?php

namespace App\Services\User;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class SignatureService
{
    /**
     * Upload tanda tangan direktur dan simpan path-nya ke database.
     * File lama otomatis dihapus jika sudah ada.
     */
    public function upload(User $user, UploadedFile $file): string
    {
        // Hapus signature lama jika sudah ada
        $this->deleteOldSignature($user);

        // Simpan file baru ke storage/app/public/signatures/
        $path = $file->store('signatures', 'public');

        // Update path di database
        $user->update(['signature_path' => $path]);

        return $path;
    }

    /**
     * Hapus signature lama dari storage
     */
    private function deleteOldSignature(User $user): void
    {
        if ($user->signature_path && Storage::disk('public')->exists($user->signature_path)) {
            Storage::disk('public')->delete($user->signature_path);
        }
    }
}