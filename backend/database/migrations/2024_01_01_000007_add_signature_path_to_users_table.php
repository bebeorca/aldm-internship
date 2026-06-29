<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tidak perlu migration ini lagi karena signature_path
        // sudah dimasukkan langsung ke create_users_table
    }

    public function down(): void
    {
        //
    }
};
