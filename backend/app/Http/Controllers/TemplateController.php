<?php

namespace App\Http\Controllers;

use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
     * POST /api/templates
     * Support multipart/form-data (file upload .docx) dan JSON biasa.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nama'         => 'required|string|max:100',
            'jenis_surat'  => 'required|string|max:50',
            'isi_template' => 'nullable|string',
            'file_docx'    => 'nullable|file|mimes:docx,doc|max:10240',
            'variabel'     => 'nullable|array',
            'is_active'    => 'boolean',
            'created_by'   => 'nullable|integer',
        ]);

        // Simpan file .docx ke storage/app/public/templates
        $pathDocx = 'templates/placeholder.docx';
        if ($request->hasFile('file_docx')) {
            $pathDocx = $request->file('file_docx')->store('templates', 'public');
        }

        // Auto-extract {{variabel}} dari isi_template jika variabel belum dikirim eksplisit
        $variabel = $request->input('variabel', []);
        if (empty($variabel) && $request->filled('isi_template')) {
            preg_match_all('/\{\{(\w+)\}\}/', $request->input('isi_template'), $matches);
            $variabel = array_values(array_unique($matches[1]));
        }

        $template = Template::create([
            'nama'        => $request->input('nama'),
            'jenis_surat' => strtoupper($request->input('jenis_surat')),
            'path_docx'   => $pathDocx,
            'variabel'    => $variabel,
            'is_active'   => $request->boolean('is_active', true),
            'created_by'  => $request->input('created_by'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil dibuat.',
            'data'    => $template,
        ], 201);
    }
}