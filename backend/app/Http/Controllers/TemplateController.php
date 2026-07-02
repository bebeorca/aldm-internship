<?php

namespace App\Http\Controllers;

use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class TemplateController extends Controller
{
    /**
     * GET /api/templates
     */
    public function index(): JsonResponse
    {
        $templates = Template::orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data'    => $templates,
        ]);
    }

    /**
     * GET /api/templates/{id}
     */
    public function show(Template $template): JsonResponse
    {
        return response()->json([
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

        return response()->json([
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

        // Replace common DOCX inline tags with newlines so text remains readable
        $xml = preg_replace('/<w:(?:br|cr|tab)[^>]*\/?>/i', "\n", $xml);

        // Gabung semua teks di dalam tag <w:t>
        preg_match_all('/<w:t[^>]*>(.*?)<\/w:t>/s', $xml, $matches);
        $rawContent = implode('', $matches[1]);

        // Hilangkan tag XML yang masih tersisa, lalu decode entity dan rapihkan spasi
        $rawContent = preg_replace('/<[^>]+>/', ' ', $rawContent);
        $rawContent = html_entity_decode($rawContent, ENT_QUOTES | ENT_XML1);
        $rawContent = preg_replace('/[ \t]+/', ' ', $rawContent);
        $rawContent = preg_replace('/(?:\r?\n\s*)+/', "\n", $rawContent);
        $rawContent = trim($rawContent);

        // Extract {{nama_variabel}} dari raw text
        preg_match_all('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', $rawContent, $varMatches);
        $variabel = array_values(array_unique($varMatches[1]));

        return [$variabel, $rawContent];
    }
}