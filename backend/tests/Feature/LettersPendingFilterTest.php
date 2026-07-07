<?php

use App\Models\Letter;
use App\Models\Template;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns only letters with pending approval when filtered by status=pending', function () {
    $maker = User::factory()->create(['role' => 'pembuat']);

    $template = Template::create([
        'nama' => 'Test Template',
        'jenis_surat' => 'TEST',
        'path_docx' => 'templates/test.docx',
        'variabel' => ['nama_penerima'],
        'raw_content' => 'test',
        'is_active' => true,
        'created_by' => $maker->id,
    ]);

    Letter::create([
        'template_id' => $template->id,
        'created_by' => $maker->id,
        'nomor_surat' => 'PENDING/001',
        'data_surat' => ['nama_penerima' => 'A'],
        'path_docx' => 'letters/a.docx',
        'status' => 'pending_approval',
    ]);

    Letter::create([
        'template_id' => $template->id,
        'created_by' => $maker->id,
        'nomor_surat' => 'APPROVED/001',
        'data_surat' => ['nama_penerima' => 'B'],
        'path_docx' => 'letters/b.docx',
        'status' => 'approved',
    ]);

    Letter::create([
        'template_id' => $template->id,
        'created_by' => $maker->id,
        'nomor_surat' => 'DRAFT/001',
        'data_surat' => ['nama_penerima' => 'C'],
        'path_docx' => 'letters/c.docx',
        'status' => 'draft',
    ]);

    $response = $this->getJson('/api/letters?status=pending');

    $response->assertOk();
    $response->assertJsonCount(1, 'data');
    expect($response->json('data.0.status'))->toBe('pending_approval');
});
