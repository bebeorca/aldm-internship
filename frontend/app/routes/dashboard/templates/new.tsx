import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Upload, X, FileText, ChevronLeft, Loader2 } from 'lucide-react';
import mammoth from 'mammoth';
import { templateService } from '../../../services/api';

const JENIS_OPTIONS = ['BAA', 'SPK', 'MOU', 'KONTRAK'];

export default function NewTemplatePage() {
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [nama, setNama]           = useState('');
  const [jenisSurat, setJenisSurat] = useState('');
  const [file, setFile]           = useState<File | null>(null);
  const [docxHtml, setDocxHtml]   = useState('');
  const [docxVars, setDocxVars]   = useState<string[]>([]);
  const [reading, setReading]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setDocxHtml('');
    setDocxVars([]);
    setReading(true);
    setError('');

    try {
      const arrayBuffer = await f.arrayBuffer();

      // Render HTML untuk pratinjau
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      setDocxHtml(htmlResult.value);

      // Extract teks bersih untuk deteksi variabel
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const matches = textResult.value.match(/\{\{(\w+)\}\}/g) ?? [];
      const vars = [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
      setDocxVars(vars);
    } catch {
      setError('Gagal membaca file DOCX. Pastikan file tidak corrupt.');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setReading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setDocxHtml('');
    setDocxVars([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!nama.trim()) { setError('Nama template wajib diisi.'); return; }
    if (!jenisSurat)  { setError('Kategori wajib dipilih.'); return; }
    if (!file)        { setError('File DOCX wajib diupload.'); return; }

    setSubmitting(true);
    setError('');

    const form = new FormData();
    form.append('nama', nama.trim());
    form.append('jenis_surat', jenisSurat);
    form.append('file_docx', file);

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
    <div className="flex items-start bg-gray-50 min-h-full">

      {/* ─── Kiri: Form ─── */}
      <div className="flex-1 p-8">
        <button
          onClick={() => navigate('/dashboard/templates')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-6 transition-colors"
        >
          <ChevronLeft size={13} /> Kembali ke Template
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Tambah Template</h1>
            <p className="text-xs text-gray-400 mt-1">Dashboard › Template › Tambah Template</p>
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
              disabled={submitting || reading}
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
              className="w-full px-3 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
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
              className="w-full px-3 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="">Pilih kategori...</option>
              {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          {/* Upload DOCX — WAJIB */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Upload File DOCX <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Variabel di dalam file menggunakan format{' '}
              <code className="bg-gray-100 px-1 rounded font-mono text-[11px]">{'{{nama_variabel}}'}</code>.
              Frontend akan membaca dan mendeteksi variabel otomatis.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-3 px-4 py-3 border border-emerald-200 bg-emerald-50 rounded-xl">
                {reading ? (
                  <Loader2 size={16} className="text-emerald-500 animate-spin shrink-0" />
                ) : (
                  <FileText size={16} className="text-emerald-600 shrink-0" />
                )}
                <span className="text-sm text-emerald-700 flex-1 truncate">{file.name}</span>
                <button onClick={handleRemoveFile}>
                  <X size={14} className="text-emerald-500 hover:text-emerald-700" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors"
              >
                <Upload size={22} />
                <span className="text-xs">Klik untuk upload file .docx</span>
              </button>
            )}
          </div>

          {/* Variabel yang terdeteksi */}
          {docxVars.length > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-xs font-medium text-emerald-700 mb-2">
                {docxVars.length} variabel terdeteksi dari file:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {docxVars.map((v) => (
                  <span
                    key={v}
                    className="text-[11px] bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-mono"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── Kanan: Pratinjau ─── */}
      <div className="w-80 sticky top-0 h-screen overflow-y-auto border-l border-gray-200 bg-white shrink-0">
        <div className="p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
            Pratinjau
          </p>
          <p className="text-[11px] text-gray-400 mb-4">
            Render langsung dari isi file .docx yang diupload.
          </p>

          <div className="border border-gray-200 rounded-xl overflow-hidden min-h-[200px]">
            {reading && (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-300">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Membaca file...</span>
              </div>
            )}
            {!reading && docxHtml && (
              <div
                className="p-4 text-xs text-gray-700 leading-relaxed"
                style={{ fontSize: '11px', lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            )}
            {!reading && !docxHtml && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                <FileText size={28} className="mb-2" />
                <p className="text-xs italic text-center px-4">
                  Upload file .docx untuk melihat pratinjau isi dokumen
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}