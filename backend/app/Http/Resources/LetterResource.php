<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'nomor_surat'  => $this->nomor_surat,
            'status'       => $this->status,
            'data_surat'   => $this->data_surat,
            'path_docx'    => $this->path_docx,
            'path_pdf'     => $this->path_pdf,
            'created_at'   => $this->created_at?->toDateTimeString(),
            'updated_at'   => $this->updated_at?->toDateTimeString(),

            // Relasi (hanya muncul kalau di-load)
            'template'     => $this->whenLoaded('template', fn() => [
                'id'          => $this->template->id,
                'nama'        => $this->template->nama,
                'jenis_surat' => $this->template->jenis_surat,
            ]),
            'creator'      => $this->whenLoaded('creator', fn() => [
                'id'   => $this->creator->id,
                'nama' => $this->creator->nama,
                'role' => $this->creator->role,
            ]),
            'latest_approval' => $this->whenLoaded('latestApproval', fn() => $this->latestApproval ? [
                'status'      => $this->latestApproval->status,
                'catatan'     => $this->latestApproval->catatan,
                'reviewed_at' => $this->latestApproval->reviewed_at?->toDateTimeString(),
                'reviewer'    => [
                    'nama' => $this->latestApproval->reviewer?->nama,
                ],
            ] : null),
        ];
    }
}