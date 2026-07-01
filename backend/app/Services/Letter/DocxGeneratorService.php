<?php

namespace App\Services\Letter;

use App\Models\Template;
use PhpOffice\PhpWord\TemplateProcessor;
use Illuminate\Support\Facades\Storage;

class DocxGeneratorService
{
    /**
     * Generate DOCX dari template dengan data yang diberikan
     * Return path file yang disimpan (relatif dari storage/app/)
     *
     * @throws \RuntimeException
     */
    public function generate(Template $template, array $data): string
    {
        $templatePath = Storage::disk('public')->path($template->path_docx);

        if (!file_exists($templatePath)) {
            throw new \RuntimeException("File template tidak ditemukan: {$template->path_docx}");
        }

        $processor = new TemplateProcessor($templatePath);

        // Replace semua placeholder sesuai data
        foreach ($data as $key => $value) {
            $processor->setValue($key, $value ?? '');
        }

        // Sisipkan TTD direktur jika sudah upload
        $this->insertSignatureIfExists($processor);

        // Simpan ke storage
        $outputPath = $this->buildOutputPath();
        $this->ensureDirectoryExists(dirname(storage_path('app/' . $outputPath)));
        $processor->saveAs(Storage::disk('public')->path($outputPath));

        return $outputPath;
    }

    /**
     * Sisipkan gambar TTD direktur ke placeholder ${tanda_tangan}
     * Jika belum ada TTD, placeholder dibiarkan kosong
     */
    private function insertSignatureIfExists(TemplateProcessor $processor): void
    {
        $direktur = \App\Models\User::where('role', 'direktur')
            ->whereNotNull('signature_path')
            ->first();

        if (!$direktur)
            return;

        $signaturePath = storage_path('app/' . $direktur->signature_path);

        if (!file_exists($signaturePath))
            return;

        $processor->setImageValue('tanda_tangan', [
            'path' => $signaturePath,
            'width' => 100,
            'height' => 50,
            'ratio' => true,
        ]);
    }

    private function buildOutputPath(): string
    {
        return 'letters/draft/letter_' . time() . '_' . uniqid() . '.docx';
    }

    private function ensureDirectoryExists(string $dir): void
    {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}