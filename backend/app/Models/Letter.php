<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Letter extends Model
{
    use HasFactory;

    protected $fillable = [
        'template_id',
        'created_by',
        'nomor_surat',
        'data_surat',
        'path_docx',
        'path_pdf',
        'status',
        'catatan_reject',
    ];

    protected $casts = [
        'data_surat' => 'array',  // otomatis encode/decode JSON
    ];

    // =========================================================
    // RELASI
    // =========================================================

    /** Template yang digunakan surat ini */
    public function template()
    {
        return $this->belongsTo(Template::class, 'template_id');
    }

    /** User yang membuat surat ini */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Semua riwayat approval surat ini */
    public function approvals()
    {
        return $this->hasMany(Approval::class, 'letter_id');
    }

    /** Approval terakhir (yang paling relevan) */
    public function latestApproval()
    {
        return $this->hasOne(Approval::class, 'letter_id')->latestOfMany();
    }

    // =========================================================
    // SCOPE
    // =========================================================

    /** Filter berdasarkan status */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /** Surat yang menunggu approval */
    public function scopePending($query)
    {
        return $query->where('status', 'pending_approval');
    }

    /** Surat yang sudah disetujui */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /** Surat milik user tertentu */
    public function scopeOwnedBy($query, int $userId)
    {
        return $query->where('created_by', $userId);
    }

    // =========================================================
    // HELPER
    // =========================================================

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending_approval';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /** Cek apakah surat sudah bisa di-export */
    public function canExport(): bool
    {
        return $this->status === 'approved';
    }
}
