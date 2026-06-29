<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('letters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('templates')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('nomor_surat', 100)->unique(); // ex: 001/MOU/VI/2026
            $table->jsonb('data_surat');                  // pakai jsonb di pgsql (lebih optimal dari json)
            $table->string('path_docx');                  // hasil generate DOCX
            $table->string('path_pdf')->nullable();       // diisi setelah export PDF
            $table->string('status')->default('draft');   // draft | pending_approval | approved | rejected
            $table->text('catatan_reject')->nullable();   // alasan reject dari direktur
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letters');
    }
};
