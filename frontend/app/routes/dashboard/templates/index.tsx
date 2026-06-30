import { useNavigate } from 'react-router';
import { FileText, Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { useTemplates } from '../../../hooks/useTemplates';
import Base from '~/components/ui/Base';
import ScreenHeader from '~/components/ui/ScreenHeader';
import PageLoader from '~/components/ui/PageLoader';
import ErrorAlert from '~/components/ui/ErrorAlert';
import type { Template } from '~/types';

const JENIS_COLOR: Record<string, string> = {
  BAA:     'bg-blue-100 text-blue-700',
  SPK:     'bg-emerald-100 text-emerald-700',
  MOU:     'bg-purple-100 text-purple-700',
  KONTRAK: 'bg-amber-100 text-amber-700',
};

function jenisBadge(jenis: string) {
  return JENIS_COLOR[jenis.toUpperCase()] ?? 'bg-gray-100 text-gray-600';
}

function TemplateCard({ template }: { template: Template }) {
  const navigate = useNavigate();

  // Cek apakah file docx sudah benar-benar diupload (bukan placeholder)
  const hasRealFile = template.path_docx &&
    template.path_docx !== 'templates/placeholder.docx';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {/* Preview area */}
      <div className="h-28 bg-gray-50 border-b border-gray-100 flex items-center justify-center relative">
        <div className="w-14 bg-white border border-gray-200 rounded shadow-sm flex flex-col items-center justify-center gap-1 p-3 py-4">
          <div className="w-8 h-0.5 bg-gray-300 rounded" />
          <div className="w-10 h-0.5 bg-gray-200 rounded" />
          <div className="w-10 h-0.5 bg-gray-200 rounded" />
          <div className="w-6 h-0.5 bg-gray-200 rounded" />
        </div>
        <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md ${jenisBadge(template.jenis_surat)}`}>
          {template.jenis_surat}
        </span>
        {/* Badge jika belum ada file */}
        {!hasRealFile && (
          <span className="absolute top-2 right-2 text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md">
            Belum ada file
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-sm font-medium text-gray-800 truncate">{template.nama}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {template.variabel.length} variabel
          {template.created_at && (
            <> · {new Date(template.created_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}</>
          )}
        </p>

        {/* Variabel badges */}
        {template.variabel.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {template.variabel.slice(0, 3).map((v) => (
              <span key={v} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                {`{{${v}}}`}
              </span>
            ))}
            {template.variabel.length > 3 && (
              <span className="text-[10px] text-gray-400">+{template.variabel.length - 3} lagi</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => navigate(`/letters/create/mou?template_id=${template.id}`)}
            disabled={!hasRealFile}
            title={!hasRealFile ? 'Upload file .docx terlebih dahulu' : 'Gunakan template ini'}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-600
              hover:border-emerald-300 hover:text-emerald-700 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600"
          >
            Gunakan
          </button>
          <button
            title="Edit template"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            title="Hapus template"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { templates, loading, error } = useTemplates();

  if (loading) return <PageLoader />;

  return (
    <Base>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <ScreenHeader
          title="Template Surat"
          description="Kelola template surat yang tersedia untuk seluruh divisi."
        />
        <button
          onClick={() => navigate('/dashboard/templates/new')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors shrink-0"
        >
          <Plus size={15} />
          Tambah Template
        </button>
      </div>

      {/* Error dari API */}
      {error && <div className="mb-6"><ErrorAlert message={error} /></div>}

      {/* Empty state — belum ada template sama sekali di database */}
      {!error && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-2xl text-center">
          <FolderOpen size={40} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Belum ada template</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Klik "+ Tambah Template" untuk membuat template pertama.
            Upload file <code className="font-mono bg-gray-100 px-1 rounded">.docx</code> template surat agar bisa digunakan.
          </p>
          <button
            onClick={() => navigate('/dashboard/templates/new')}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Plus size={14} />
            Upload Template Pertama
          </button>
        </div>
      )}

      {/* Grid template dari database */}
      {templates.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} />
          ))}
        </div>
      )}
    </Base>
  );
}