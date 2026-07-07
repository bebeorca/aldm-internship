<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\Template;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LetterApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_approves_a_pending_letter_and_records_the_approval(): void
    {
        /** @var User $director */
        $director = User::factory()->create(['role' => 'direktur']);
        /** @var User $maker */
        $maker = User::factory()->create(['role' => 'pembuat']);
        $template = Template::create([
            'nama' => 'Surat Keterangan',
            'jenis_surat' => 'SPT',
            'path_docx' => 'templates/test.docx',
            'variabel' => ['nama_penerima'],
            'raw_content' => 'test',
            'is_active' => true,
            'created_by' => $maker->id,
        ]);
        $letter = Letter::create([
            'template_id' => $template->id,
            'created_by' => $maker->id,
            'nomor_surat' => '001/TEST/2026',
            'data_surat' => ['nama_penerima' => 'Budi'],
            'path_docx' => 'letters/test.docx',
            'status' => 'pending_approval',
        ]);

        $response = $this->actingAs($director)->patchJson("/api/letters/{$letter->id}/approve", [
            'catatan' => 'Sudah sesuai',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('letters', [
            'id' => $letter->id,
            'status' => 'approved',
            'catatan_reject' => null,
        ]);
        $this->assertDatabaseHas('approvals', [
            'letter_id' => $letter->id,
            'reviewed_by' => $director->id,
            'status' => 'approved',
        ]);
    }

    public function test_rejects_a_pending_letter_and_stores_the_rejection_note(): void
    {
        /** @var User $director */
        $director = User::factory()->create(['role' => 'direktur']);
        /** @var User $maker */
        $maker = User::factory()->create(['role' => 'pembuat']);
        $template = Template::create([
            'nama' => 'Surat Keterangan',
            'jenis_surat' => 'SPT',
            'path_docx' => 'templates/test.docx',
            'variabel' => ['nama_penerima'],
            'raw_content' => 'test',
            'is_active' => true,
            'created_by' => $maker->id,
        ]);
        $letter = Letter::create([
            'template_id' => $template->id,
            'created_by' => $maker->id,
            'nomor_surat' => '002/TEST/2026',
            'data_surat' => ['nama_penerima' => 'Budi'],
            'path_docx' => 'letters/test.docx',
            'status' => 'pending_approval',
        ]);

        $response = $this->actingAs($director)->patchJson("/api/letters/{$letter->id}/reject", [
            'catatan' => 'Harus diperbaiki',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('letters', [
            'id' => $letter->id,
            'status' => 'rejected',
            'catatan_reject' => 'Harus diperbaiki',
        ]);
        $this->assertDatabaseHas('approvals', [
            'letter_id' => $letter->id,
            'reviewed_by' => $director->id,
            'status' => 'rejected',
            'catatan' => 'Harus diperbaiki',
        ]);
    }
}
