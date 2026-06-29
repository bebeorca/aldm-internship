<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SyncLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'tipe',
        'nama_file',
        'jumlah_data',
        'status',
        'pesan_error',
    ];

    protected $casts = [
        'jumlah_data' => 'integer',
    ];

    // =========================================================
    // RELASI
    // =========================================================

    /** User yang melakukan sinkronisasi */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // =========================================================
    // SCOPE
    // =========================================================

    /** Filter log yang berhasil */
    public function scopeSuccess($query)
    {
        return $query->where('status', 'success');
    }

    /** Filter log yang gagal */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    // =========================================================
    // HELPER
    // =========================================================

    public function isSuccess(): bool
    {
        return $this->status === 'success';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }
}
