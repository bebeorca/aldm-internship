import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Upload, X, FileText, ChevronLeft } from 'lucide-react';
import { templateService } from '../../../services/api';

const JENIS_OPTIONS = ['BAA', 'SPK', 'MOU', 'KONTRAK'];

function extractVariabel(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}

export default function NewTemplatePage() {
  const navigate = useNavigate();
  const [nama, setNama]               = useState('');
  const [jenisSurat, setJenisSurat]   = useState('');
  const [isiTemplate, setIsiTemplate] = useState('');
  const [file, setFile]               = useState<File | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  

  // Real-time: auto-extract variabel dari isi template setiap kali user mengetik
  const variabel = extractVariabel(isiTemplate);

  const handleSubmit = async () => {
    if (!nama.trim() || !jenisSurat) {
      setError('Nama template dan kategori wajib diisi.');
      return;
    }
    setSubmitting(true);
    setError('');

    const form = new FormData();
    form.append('nama', nama.trim());
    form.append('jenis_surat', jenisSurat);
    form.append('isi_template', isiTemplate);
    variabel.forEach((v) => form.append('variabel[]', v));
    if (file) form.append('file_docx', file);

    try {
      await templateService.create(form);
      navigate('/dashboard/templates');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan template.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // FIX: hapus h-screen & overflow-hidden — keduanya bertabrakan dengan _layout.tsx
    // Gunakan flex items-start agar right panel bisa sticky tanpa merusak scroll
    <div className="flex items-start bg-gray-50 min-h-full">

      {/* ── Kiri: Form ─────────────────────────────────── */}
      <div className="flex-1 p-8">

        <button
          onClick={() => navigate('/dashboard/templates')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-6 transition-colors"
        >
          <ChevronLeft size={13} />
          Kembali ke Template
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Editor Template</h1>
            <p className="text-xs text-gray-400 mt-1">Dashboard › Template › Editor Template</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/dashboard/templates')}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Template'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="max-w-lg space-y-5">

          {/* Nama Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama Template
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="cth: MOU Peserta Training"
              className="w-full px-3 py-2.5 text-sm text-black bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kategori
            </label>
            <select
              value={jenisSurat}
              onChange={(e) => setJenisSurat(e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-black bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="">Pilih kategori...</option>
              {JENIS_OPTIONS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Isi Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Isi Template
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Gunakan{' '}
              <code className="bg-gray-100 px-1 rounded font-mono text-[11px]">
                {'{{variabel}}'}
              </code>{' '}
              untuk placeholder yang akan diisi saat membuat surat.
            </p>
            <textarea
              value={isiTemplate}
              onChange={(e) => setIsiTemplate(e.target.value)}
              rows={10}
              placeholder={'Dengan hormat,\n\nBersama surat ini kami sampaikan {{perihal}} kepada {{tujuan}}.\n\nDemikian kami sampaikan.\n\nHormat kami,\n{{pembuat}}'}
              className="w-full px-3 py-2.5 text-sm text-black bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none font-mono leading-relaxed"
            />

            {/* Variabel yang terdeteksi otomatis */}
            {variabel.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-gray-400 mr-1 self-center">Terdeteksi:</span>
                {variabel.map((v) => (
                  <span
                    key={v}
                    className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-mono"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Upload DOCX */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Upload File DOCX{' '}
              <span className="text-gray-400 font-normal">(opsional — bisa diisi belakangan)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".docx,.doc"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-3 px-4 py-3 border border-emerald-200 bg-emerald-50 rounded-xl">
                <FileText size={16} className="text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-700 flex-1 truncate">{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  <X size={14} className="text-emerald-500 hover:text-emerald-700" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors"
              >
                <Upload size={20} />
                <span className="text-xs">Klik untuk upload file .docx</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ── Kanan: Pratinjau (sticky — tetap tampil saat form di-scroll) ── */}
      {/* FIX: sticky top-0 + h-screen agar panel pratinjau tidak ikut scroll */}
      <div className="w-80 sticky top-0 h-screen overflow-y-auto border-l border-gray-200 bg-white shrink-0">
        <div className="p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Pratinjau
          </p>
          <p className="text-[11px] text-gray-400 mb-4">
            Update otomatis saat kamu mengetik isi template.
          </p>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Kop surat */}
            <div className="bg-white px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                <FileText size={13} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">PT. ALDM</p>
                <p className="text-[10px] text-gray-400">Penyuratan Digital</p>
              </div>
            </div>

            {/* Isi pratinjau */}
            <div className="px-5 py-4">
              <div className="space-y-1 mb-4">
                <div className="flex gap-2 text-xs">
                  <span className="text-gray-400 w-14 shrink-0">Nomor</span>
                  <span className="text-gray-300 font-mono text-[11px]">: {'{{nomor_surat}}'}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-gray-400 w-14 shrink-0">Hal</span>
                  <span className="text-gray-300 font-mono text-[11px]">
                    : {variabel.includes('perihal') ? '{{perihal}}' : '—'}
                  </span>
                </div>
              </div>

              {/* Konten template — update real-time */}
              <div className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed min-h-[100px] font-mono">
                {isiTemplate || (
                  <span className="text-gray-300 italic not-italic font-sans">
                    Isi template akan muncul di sini saat kamu mengetik...
                  </span>
                )}
              </div>

              {/* Tanda tangan */}
              <div className="mt-6 text-right">
                <p className="text-xs text-gray-300">Hormat kami,</p>
                <div className="mt-5">
                  <p className="text-xs font-medium text-gray-400">
                    {variabel.includes('pembuat') ? '{{pembuat}}' : 'Nama Penandatangan'}
                  </p>
                  <p className="text-[10px] text-gray-300">Direktur Utama · PT. ALDM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan variabel */}
          {variabel.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-[11px] font-medium text-gray-500 mb-2">
                {variabel.length} variabel akan disimpan
              </p>
              <div className="space-y-1">
                {variabel.map((v) => (
                  <div key={v} className="flex items-center gap-2 text-[11px] text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <code className="font-mono">{`{{${v}}}`}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}