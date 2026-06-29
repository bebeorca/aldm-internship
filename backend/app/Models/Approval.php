<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Approval extends Model
{
    use HasFactory;

    protected $fillable = [
        'letter_id',
        'reviewed_by',
        'status',
        'catatan',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    // =========================================================
    // RELASI
    // =========================================================

    /** Surat yang di-review */
    public function letter()
    {
        return $this->belongsTo(Letter::class, 'letter_id');
    }

    /** Direktur yang mereview */
    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // =========================================================
    // HELPER
    // =========================================================

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }
}
