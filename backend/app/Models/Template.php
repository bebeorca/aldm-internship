<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Template extends Model
{
    use HasFactory;

    protected $fillable = [
        'nama',
        'jenis_surat',
        'path_docx',
        'variabel',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'variabel'  => 'array',   // otomatis encode/decode JSON
        'is_active' => 'boolean',
    ];

    // =========================================================
    // RELASI
    // =========================================================

    /** Admin yang membuat template ini */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Semua surat yang menggunakan template ini */
    public function letters()
    {
        return $this->hasMany(Letter::class, 'template_id');
    }

    // =========================================================
    // SCOPE
    // =========================================================

    /** Hanya ambil template yang aktif */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** Filter berdasarkan jenis surat */
    public function scopeByJenis($query, string $jenis)
    {
        return $query->where('jenis_surat', strtoupper($jenis));
    }
}
