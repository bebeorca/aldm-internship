<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nomor_surat_counters', function (Blueprint $table) {
            $table->id();
            $table->string('jenis_surat', 50);
            $table->smallInteger('tahun');
            $table->tinyInteger('bulan');
            $table->integer('counter')->default(0);
            $table->timestamps();

            $table->unique(['jenis_surat', 'tahun', 'bulan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomor_surat_counters');
    }
};
