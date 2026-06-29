// src/routes/letters/create.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Upload, X, ChevronLeft, Loader2, FileSpreadsheet } from 'lucide-react';
import { templateService, letterService } from '../../services/api';
import type { Template } from '../../types';
import Base from '~/components/ui/Base';
import ScreenHeader from '~/components/ui/ScreenHeader';
import GreenButton from '~/components/ui/GreenButton';

export default function CreateLetterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // if (!templateId) { navigate('/dashboard'); return; }

    templateService.getAll()
      .then((res) => {
        const tpl = res.data.data.find((t: Template) => t.id === Number(templateId));
        if (!tpl) { navigate('/dashboard'); return; }
        setTemplate(tpl);
        // Init form fields kosong
        const init: Record<string, string> = {};
        tpl.variabel.forEach((v: string) => (init[v] = ''));
        setFormData(init);
      })
      .catch(() => setError('Gagal memuat template.'))
      .finally(() => setLoading(false));
  }, [templateId]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    try {
      const res = await letterService.syncCsv(file);
      // Ambil baris pertama dari CSV
      const row = res.data.data?.[0] ?? {};
      setFormData((prev) => {
        const updated = { ...prev };
        Object.keys(row).forEach((k) => {
          if (k in updated) updated[k] = row[k];
        });
        return updated;
      });
    } catch {
      setError('Gagal membaca file CSV.');
    } finally {
      setCsvLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    const empty = Object.entries(formData).filter(([, v]) => !v.trim());
    if (empty.length > 0) {
      setError(`Field berikut belum diisi: ${empty.map(([k]) => k).join(', ')}`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await letterService.create({ template_id: Number(templateId), data_surat: formData });
      navigate('/letters');
    } catch {
      setError('Gagal menyimpan surat. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format label dari snake_case → Title Case
  const formatLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Memuat form...</span>
      </div>
    );
  }

  return (
    <Base>
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Kembali
      </button>

      {/* Header */}
      <ScreenHeader title="Buat Surat" description="Memoriam of Understanding (MoU)" />

      {/* CSV Import */}
      <div className="mb-6 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Import dari CSV</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Upload file CSV untuk mengisi form secara otomatis
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={csvLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors disabled:opacity-50"
            >
              {csvLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={14} className="text-emerald-600" />
              )}
              {csvLoading ? 'Membaca...' : 'Pilih File'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-lg">
          <X size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        {template?.variabel.map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {formatLabel(key)}
            </label>
            <input
              type="text"
              value={formData[key] ?? ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={`Masukkan ${formatLabel(key).toLowerCase()}`}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-300 transition"
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Batal
        </button>
        <GreenButton onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? 'Menyimpan...' : 'Kirim untuk Approval'}
        </GreenButton>
      </div>
    </Base>
  );
}
