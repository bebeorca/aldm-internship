<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'nama',
        'email',
        'password',
        'role',
        'signature_path',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
    ];

    // =========================================================
    // RELASI
    // =========================================================

    /** Surat-surat yang dibuat oleh user ini */
    public function letters()
    {
        return $this->hasMany(Letter::class, 'created_by');
    }

    /** Template yang dibuat oleh user ini (admin) */
    public function templates()
    {
        return $this->hasMany(Template::class, 'created_by');
    }

    /** Riwayat approval yang dilakukan user ini (direktur) */
    public function approvals()
    {
        return $this->hasMany(Approval::class, 'reviewed_by');
    }

    /** Riwayat sinkronisasi data yang dilakukan user ini */
    public function syncLogs()
    {
        return $this->hasMany(SyncLog::class, 'user_id');
    }

    // =========================================================
    // HELPER
    // =========================================================

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isDirektur(): bool
    {
        return $this->role === 'direktur';
    }

    public function isPembuat(): bool
    {
        return $this->role === 'pembuat';
    }

    /** Cek apakah direktur sudah upload TTD */
    public function hasSignature(): bool
    {
        return !is_null($this->signature_path);
    }
}
