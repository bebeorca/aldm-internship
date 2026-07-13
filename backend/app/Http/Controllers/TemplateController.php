<?php

namespace App\Http\Controllers;

use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class TemplateController extends Controller
{
    /**
     * GET /api/templates
     */
    public function index(): JsonResponse
    {
        $templates = Template::query()->orderBy('created_at', 'desc')->get();

        return Response::json([
            'success' => true,
            'data'    => $templates,
        ]);
    }

    /**
     * GET /api/templates/{id}
     */
    public function show(Template $template): JsonResponse
    {
        return Response::json([
            'success' => true,
            'data'    => $template,
        ]);
    }

    /**
     * POST /api/templates
     * - File DOCX wajib
     * - Variabel diekstrak dari isi file, BUKAN dari input frontend
     * - raw_content (plain text) disimpan untuk fallback preview
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nama'        => 'required|string|max:100',
            'jenis_surat' => 'required|string|max:50',
            'file_docx'   => 'required|file|mimes:docx|max:10240',
            'is_active'   => 'boolean',
            'created_by'  => 'nullable|integer',
        ]);

        $pathDocx     = $request->file('file_docx')->store('templates', 'public');
        $absolutePath = Storage::disk('public')->path($pathDocx);

        [$variabel, $rawContent] = $this->extractFromDocx($absolutePath);

        $template = Template::create([
            'nama'        => $request->input('nama'),
            'jenis_surat' => strtoupper($request->input('jenis_surat')),
            'path_docx'   => $pathDocx,
            'variabel'    => $variabel,
            'raw_content' => $rawContent,
            'is_active'   => $request->boolean('is_active', true),
            'created_by'  => $request->input('created_by'),
        ]);

        return Response::json([
            'success' => true,
            'message' => count($variabel) . ' variabel terdeteksi dari file .docx.',
            'data'    => $template,
        ], 201);
    }

    /**
     * Buka .docx (ZIP), baca word/document.xml,
     * gabung semua <w:t> node (MS Word sering memecah satu kata jadi beberapa node),
     * lalu extract {{variabel}}.
     *
     * Return: [variabel_array, raw_text_string]
     */
    private function extractFromDocx(string $path): array
    {
        $zip = new ZipArchive();

        if ($zip->open($path) !== true) {
            return [[], ''];
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false) {
            return [[], ''];
        }

        // Gabung semua teks di dalam tag <w:t>
        preg_match_all('/<w:t[^>]*>(.*?)<\/w:t>/s', $xml, $matches);
        $rawContent = html_entity_decode(implode('', $matches[1]), ENT_QUOTES | ENT_XML1);
        
        // Cleanup: hapus Word-specific XML tags yang mungkin tertinggal
        $rawContent = preg_replace('/<w:[^>]*>/i', '', $rawContent);
        $rawContent = preg_replace('/<\/w:[^>]*>/i', '', $rawContent);
        
        // Bersihkan whitespace berlebih
        $rawContent = preg_replace('/[ \t]+/', ' ', $rawContent);
        $rawContent = preg_replace('/\n\s*\n/', "\n", $rawContent); // Bersihkan baris kosong
        $rawContent = trim($rawContent);

        // Extract {{nama_variabel}} dari raw text
        preg_match_all('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', $rawContent, $varMatches);
        $variabel = array_values(array_unique($varMatches[1]));

        return [$variabel, $rawContent];
    }
    /**
 * POST /api/templates/preview-upload
 * Upload DOCX sementara → konversi ke PDF via LibreOffice → return PDF URL + variabel.
 * Dipakai oleh new.tsx untuk preview sebelum template disimpan ke DB.
 */
public function previewUpload(Request $request): JsonResponse
{
    $request->validate([
        'file_docx' => 'required|file|mimes:docx|max:10240',
    ]);

    // Simpan ke folder temp
    $pathDocx     = $request->file('file_docx')->store('templates/temp', 'public');
    $absolutePath = Storage::disk('public')->path($pathDocx);

    // Extract variabel dari XML di dalam DOCX (ZipArchive inline)
    $variabel = [];
    $zip = new \ZipArchive();
    if ($zip->open($absolutePath) === true) {
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        if ($xml !== false) {
            preg_match_all('/<w:t[^>]*>(.*?)<\/w:t>/s', $xml, $matches);
            $raw = html_entity_decode(implode('', $matches[1]), ENT_QUOTES | ENT_XML1);
            preg_match_all('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', $raw, $varMatches);
            $variabel = array_values(array_unique($varMatches[1]));
        }
    }

    // Konversi DOCX → PDF via LibreOffice
    $pdfUrl = null;
    try {
        $pdfConverter = app(\App\Services\Letter\PdfConverterService::class);
        $pdfPath      = $pdfConverter->convert($pathDocx);
        $pdfUrl       = '/storage/' . $pdfPath;
    } catch (\RuntimeException $e) {
        \Log::warning('Preview upload PDF conversion failed', ['message' => $e->getMessage()]);
    }

    return response()->json([
        'success' => true,
        'data' => [
            'pdf_url'  => $pdfUrl,
            'variabel' => $variabel,
        ],
    ]);
}
/**
 * DELETE /api/templates/{id}
 */
public function destroy(Template $template): JsonResponse
{
    // Hapus file DOCX dari storage
    if ($template->path_docx) {
        Storage::disk('public')->delete($template->path_docx);
    }

    $template->delete();

    return response()->json([
        'success' => true,
        'message' => 'Template berhasil dihapus.',
    ]);
}
}