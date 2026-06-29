<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('tipe');                       // 'csv' | 'internal'
            $table->string('nama_file')->nullable();      // nama file CSV yang diupload
            $table->integer('jumlah_data')->default(0);  // berapa baris berhasil disinkron
            $table->string('status');                     // 'success' | 'failed'
            $table->text('pesan_error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
    }
};
