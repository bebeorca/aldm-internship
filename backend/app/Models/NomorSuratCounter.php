<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NomorSuratCounter extends Model
{
    use HasFactory;

    protected $fillable = [
        'jenis_surat',
        'tahun',
        'bulan',
        'counter',
    ];

    protected $casts = [
        'tahun'   => 'integer',
        'bulan'   => 'integer',
        'counter' => 'integer',
    ];
}
