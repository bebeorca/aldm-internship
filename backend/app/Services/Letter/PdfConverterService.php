<?php

namespace App\Services\Letter;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Konversi DOCX ke PDF menggunakan LibreOffice headless.
 * Hasilnya mirip 100% dengan tampilan Word — header, footer, tabel, font, margin.
 * Menggantikan ONLYOFFICE yang bermasalah dengan Docker private IP restriction.
 */
class PdfConverterService
{
    /**
     * Konversi file DOCX (dari disk 'public') ke PDF.
     *
     * @param  string $docxRelativePath  Path relatif dari storage/app/public/, misal: letters/draft/xxx.docx
     * @return string                    Path relatif ke file PDF hasil, misal: letters/pdf/xxx.pdf
     * @throws \RuntimeException
     */
    public function convert(string $docxRelativePath): string
    {
        $inputPath = Storage::disk('public')->path($docxRelativePath);

        if (!file_exists($inputPath)) {
            throw new \RuntimeException("File DOCX tidak ditemukan: {$docxRelativePath}");
        }

        $outputDir   = Storage::disk('public')->path('letters/pdf');
        $pdfFilename = pathinfo($docxRelativePath, PATHINFO_FILENAME) . '.pdf';
        $outputPath  = $outputDir . DIRECTORY_SEPARATOR . $pdfFilename;

        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }

        // LibreOffice headless — paling akurat untuk DOCX → PDF
        // HOME=/tmp diperlukan agar LibreOffice bisa menulis user profile sementara
        $command = sprintf(
            'HOME=/tmp libreoffice --headless --convert-to pdf --outdir %s %s 2>&1',
            escapeshellarg($outputDir),
            escapeshellarg($inputPath)
        );

        exec($command, $output, $exitCode);

        if ($exitCode !== 0 || !file_exists($outputPath)) {
            Log::error('LibreOffice PDF conversion failed', [
                'command'   => $command,
                'exit_code' => $exitCode,
                'output'    => implode("\n", $output),
            ]);
            throw new \RuntimeException('Konversi PDF gagal. Pastikan LibreOffice terinstall di container backend.');
        }

        return 'letters/pdf/' . $pdfFilename;
    }
}