<?php

namespace App\Services\Letter;

use App\DTO\StoreLetterDTO;
use App\Models\Letter;
use App\Models\Template;
use App\Services\NomorSuratService;
use Illuminate\Support\Facades\DB;

class StoreLetterService
{
    public function __construct(
        private readonly NomorSuratService     $nomorSuratService,
        private readonly LetterValidatorService $validator,
        private readonly DocxGeneratorService  $docxGenerator,
    ) {}

    /**
     * Buat surat baru dan kirim ke approval
     *
     * @throws \InvalidArgumentException|\Throwable
     */
    public function handle(StoreLetterDTO $dto): Letter
    {
        $template = Template::findOrFail($dto->templateId);

        // Validasi data surat terhadap variabel template
        $this->validator->validate($template, $dto->dataSurat);

        return DB::transaction(function () use ($dto, $template) {
            // Generate nomor surat (race-condition safe karena ada lockForUpdate)
            $nomorSurat = $this->nomorSuratService->generate($template->jenis_surat);

            // Generate file DOCX
            $pathDocx = $this->docxGenerator->generate($template, $dto->dataSurat);

            // Simpan letter
            return Letter::create([
                'template_id' => $dto->templateId,
                'created_by'  => $dto->createdBy,
                'nomor_surat' => $nomorSurat,
                'data_surat'  => $dto->dataSurat,
                'path_docx'   => $pathDocx,
                'status'      => 'pending_approval',
            ]);
        });
    }
}