<?php

namespace App\DTO;

use Carbon\Carbon;

class PesertaTrainingDTO
{
    public function __construct(
        public readonly string  $no,
        public readonly string  $nama,
        public readonly string  $tempatLahir,
        public readonly string  $tanggalLahir,
        public readonly string  $jenisKelamin,
        public readonly string  $noHp,
        public readonly string  $alamat,
        public readonly string  $posisi,
        public readonly string  $gaji,
        public readonly string  $gajiTerbilang,
        public readonly string  $tglMulaiTraining,
        public readonly string  $tglSelesaiTraining,
        public readonly string  $tglTtd,
    ) {}

    public static function fromRow(array $row): self
    {
        return new self(
            no:                 trim($row['NO']                  ?? ''),
            nama:               trim($row['NAMA']                ?? ''),
            tempatLahir:        trim($row['TEMPAT_LAHIR']        ?? ''),
            tanggalLahir:       trim($row['TANGGAL_LAHIR']       ?? ''),
            jenisKelamin:       trim($row['JENIS_KELAMIN']       ?? ''),
            noHp:               trim($row['NO_HP']               ?? ''),
            alamat:             trim($row['ALAMAT']              ?? ''),
            posisi:             trim($row['POSISI']              ?? ''),
            gaji:               trim($row['GAJI']                ?? ''),
            gajiTerbilang:      trim($row['GAJI_TERBILANG']      ?? ''),
            tglMulaiTraining:   trim($row['TGL_MULAI_TRAINING']  ?? ''),
            tglSelesaiTraining: trim($row['TGL_SELESAI_TRAINING'] ?? ''),
            tglTtd:             trim($row['TGL_TTD']             ?? ''),
        );
    }

    public function toArray(): array
    {
        return [
            'no'                  => $this->no,
            'nama'                => $this->nama,
            'tempat_lahir'        => $this->tempatLahir,
            'tanggal_lahir'       => $this->tanggalLahir,
            'jenis_kelamin'       => $this->jenisKelamin,
            'no_hp'               => $this->noHp,
            'alamat'              => $this->alamat,
            'posisi'              => $this->posisi,
            'gaji'                => $this->gaji,
            'gaji_terbilang'      => $this->gajiTerbilang,
            'tgl_mulai_training'  => $this->tglMulaiTraining,
            'tgl_selesai_training'=> $this->tglSelesaiTraining,
            'tgl_ttd'             => $this->tglTtd,
        ];
    }
}