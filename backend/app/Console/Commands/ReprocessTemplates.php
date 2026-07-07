<?php

namespace App\Console\Commands;

use App\Models\Template;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class ReprocessTemplates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'templates:reprocess {--force : Force reprocess all templates}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reprocess all templates to properly extract raw_content';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $force = $this->option('force');
        
        $query = Template::query();
        
        if (!$force) {
            $query->whereNull('raw_content');
            $this->info('Processing templates with missing raw_content...');
        } else {
            $this->info('Force reprocessing all templates...');
        }
        
        $templates = $query->get();
        $count = $templates->count();
        
        if ($count === 0) {
            $this->info('No templates to process.');
            return 0;
        }
        
        $this->withProgressBar($templates, function (Template $template) {
            try {
                if (!$template->path_docx || !Storage::disk('public')->exists($template->path_docx)) {
                    return;
                }
                
                $absolutePath = Storage::disk('public')->path($template->path_docx);
                [$variabel, $rawContent] = $this->extractFromDocx($absolutePath);
                
                $template->update([
                    'variabel' => $variabel,
                    'raw_content' => $rawContent,
                ]);
            } catch (\Exception $e) {
                $this->warn("\nError processing {$template->nama}: " . $e->getMessage());
            }
        });
        
        $this->newLine();
        $this->info("Successfully processed {$count} templates.");
        
        return 0;
    }
    
    /**
     * Extract content from DOCX file
     */
    private function extractFromDocx(string $path): array
    {
        $zip = new ZipArchive();

        if ($zip->open($path) !== true) {
            return [[], ''];
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false) {
            return [[], ''];
        }

        // Gabung semua teks di dalam tag <w:t>
        preg_match_all('/<w:t[^>]*>(.*?)<\/w:t>/s', $xml, $matches);
        $rawContent = html_entity_decode(implode('', $matches[1]), ENT_QUOTES | ENT_XML1);
        
        // Cleanup: hapus Word-specific XML tags yang mungkin tertinggal
        $rawContent = preg_replace('/<w:[^>]*>/i', '', $rawContent);
        $rawContent = preg_replace('/<\/w:[^>]*>/i', '', $rawContent);
        
        // Bersihkan whitespace berlebih
        $rawContent = preg_replace('/[ \t]+/', ' ', $rawContent);
        $rawContent = preg_replace('/\n\s*\n/', "\n", $rawContent);
        $rawContent = trim($rawContent);

        // Extract {{nama_variabel}} dari raw text
        preg_match_all('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', $rawContent, $varMatches);
        $variabel = array_values(array_unique($varMatches[1]));

        return [$variabel, $rawContent];
    }
}
