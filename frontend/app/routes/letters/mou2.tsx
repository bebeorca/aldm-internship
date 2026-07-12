import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ChevronLeft, Loader2, FileText, Upload, Tag,
  CheckCircle2, AlertCircle, Check, Bold, Italic, Underline, List, X,
} from 'lucide-react';
import { letterService, templateService } from '../../services/api';
import type { Template } from '../../types';
import Base from '~/components/ui/Base';
import ErrorAlert from '~/components/ui/ErrorAlert';

type Step = 'template' | 'form';

const APPROVAL_FLOW = ['Admin TU', 'Kepala Dept.', 'Direktur'];

/** Parse SEMUA baris CSV — return headers + array of rows */
function parseCsvAllRows(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });

  return { headers, rows };
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MouTwoPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const csvRef         = useRef<HTMLInputElement>(null);
  const attachRef      = useRef<HTMLInputElement>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [step, setStep] = useState<Step>('template');

  // Template list
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError]     = useState('');

  // Selected template + form
  const [selected, setSelected]     = useState<Template | null>(null);
  const [formData, setFormData]     = useState<Record<string, string>>({});
  const [attachment, setAttachment] = useState<File | null>(null);

  // PDF preview state
  const [pdfUrl, setPdfUrl]               = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError]   = useState('');

  // CSV row picker state
  const [csvRows, setCsvRows]           = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders]     = useState<string[]>([]);
  const [showCsvPicker, setShowCsvPicker] = useState(false);
  const [csvFileName, setCsvFileName]   = useState('');
  const [csvLoading, setCsvLoading]     = useState(false);
  const [csvMsg, setCsvMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Submit state
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load template list
  useEffect(() => {
    templateService.getAll()
      .then((res) => setTemplates(res.data.data ?? []))
      .catch(() => setListError('Gagal memuat daftar template.'))
      .finally(() => setLoadingList(false));
  }, []);

  // Auto-select dari URL ?template_id=X
  useEffect(() => {
    const tid = searchParams.get('template_id');
    if (!tid) return;
    templateService.getById(Number(tid))
      .then((res) => selectTemplate(res.data.data))
      .catch(() => setListError('Template tidak ditemukan.'));
  }, []);

  // Debounce preview — generate PDF setiap kali selected/formData berubah
  useEffect(() => {
    if (!selected) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoadingPreview(true);
      setPreviewError('');

      try {
        const res = await letterService.generatePreview({
          template_id: selected.id,
          data_surat: formData,
        });

        if (res.data?.success) {
          // Tambah key sebagai query param agar iframe reload dokumen baru
          setPdfUrl(res.data.data.pdf_url + '?v=' + res.data.data.key);
        }
      } catch (err: any) {
        setPreviewError(err?.response?.data?.message ?? 'Gagal membuat pratinjau.');
        setPdfUrl(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 900);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selected, formData]);

  const selectTemplate = (tpl: Template) => {
    setSelected(tpl);
    const initial: Record<string, string> = {};
    tpl.variabel.forEach((v) => (initial[v] = ''));
    setFormData(initial);
    setCsvMsg(null);
    setCsvFileName('');
    setCsvRows([]);
    setShowCsvPicker(false);
    setSubmitError('');
    setPdfUrl(null);
    setStep('form');
  };

  const handleFieldChange = (key: string, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  // CSV: parse semua baris, tampilkan row picker
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvLoading(true);
    setCsvMsg(null);
    setShowCsvPicker(false);

    try {
      const text = await file.text();
      const { headers, rows } = parseCsvAllRows(text);

      if (rows.length === 0) throw new Error('CSV tidak memiliki data. Minimal 1 baris header + 1 baris data.');

      setCsvHeaders(headers);
      setCsvRows(rows);
      setShowCsvPicker(true);
      setCsvMsg({ type: 'success', text: `${rows.length} baris data ditemukan. Pilih nomor baris di bawah.` });
    } catch (err: any) {
      setCsvMsg({ type: 'error', text: err.message || 'Gagal membaca file CSV.' });
    } finally {
      setCsvLoading(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  };

  // Pilih baris CSV tertentu → isi form
  const handleSelectCsvRow = (rowIndex: number) => {
    const row = csvRows[rowIndex];
    if (!row) return;

    const matchedKeys: string[] = [];
    setFormData((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (row[k] !== undefined) {
          updated[k] = row[k];
          matchedKeys.push(k);
        }
      });
      return updated;
    });

    setCsvMsg({
      type: 'success',
      text: `Baris ${rowIndex + 1} berhasil diisi: ${matchedKeys.map(formatLabel).join(', ')}.`,
    });
    setShowCsvPicker(false);
  };

  // Submit surat
  const handleSubmit = async () => {
    if (!selected) return;

    const empty = selected.variabel.filter((k) => !formData[k]?.trim());
    if (empty.length > 0) {
      setSubmitError(`Field belum diisi: ${empty.map(formatLabel).join(', ')}`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await letterService.create({ template_id: selected.id, data_surat: formData });
      navigate('/letters');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const dbg = err?.response?.data?.debug;
      setSubmitError(dbg ? `${msg} — ${dbg}` : (msg ?? 'Gagal mengirim surat.'));
    } finally {
      setSubmitting(false);
    }
  };

  const nomorSurat = `ND/ALDM/VI/2026/${String(selected?.id ?? 0).padStart(3, '0')}`;

  // ====== STEP 1: PILIH TEMPLATE ======
  if (step === 'template') {
    return (
      <PageShell step={1}>
        {loadingList && (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">Memuat template...</span>
          </div>
        )}
        {!loadingList && listError && <ErrorAlert message={listError} />}
        {!loadingList && !listError && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText size={32} className="mb-3 text-gray-300" />
            <p className="text-sm">Belum ada template.</p>
            <button onClick={() => navigate('/dashboard/templates/new')} className="mt-3 text-xs text-emerald-600 hover:underline">
              Tambah template →
            </button>
          </div>
        )}
        {!loadingList && !listError && templates.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                <div className="h-24 bg-gray-50 border-b border-gray-100 flex items-center justify-center relative">
                  <FileText size={22} className="text-gray-300" />
                  <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                    {tpl.jenis_surat}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-800 truncate">{tpl.nama}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Tag size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{tpl.variabel.length} variabel</span>
                  </div>
                  {tpl.variabel.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.variabel.slice(0, 2).map((v) => (
                        <span key={v} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                      ))}
                      {tpl.variabel.length > 2 && <span className="text-[10px] text-gray-400">+{tpl.variabel.length - 2}</span>}
                    </div>
                  )}
                  <button
                    onClick={() => selectTemplate(tpl)}
                    className="w-full mt-3 text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                  >
                    Gunakan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageShell>
    );
  }

  // ====== STEP 2: ISI KONTEN ======
  return (
    <PageShell step={2}>
      <button
        onClick={() => setStep('template')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors"
      >
        <ChevronLeft size={16} /> Ganti template
      </button>

      <div className="grid grid-cols-3 gap-6">

        {/* ─── Kiri: Form ─── */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Informasi Surat</h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Nomor Surat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nomor Surat <span className="text-gray-400 font-normal">(otomatis)</span>
              </label>
              <div className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
                <span className="text-sm font-mono text-gray-700">{nomorSurat}</span>
                <span className="text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">Auto</span>
              </div>
            </div>

            {/* Field dinamis dari template.variabel */}
            {selected?.variabel.length === 0 && (
              <p className="text-sm text-gray-400 italic">Template ini tidak memiliki variabel isian.</p>
            )}
            {selected?.variabel.map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{formatLabel(key)}</label>
                <input
                  type="text"
                  value={formData[key] ?? ''}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  placeholder={`Masukkan ${formatLabel(key).toLowerCase()}`}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-800 bg-white placeholder:text-gray-300"
                />
              </div>
            ))}

            {/* Tanggal + Jenis Surat */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Surat</label>
                <input type="date" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-800 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis Surat</label>
                <div className="px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg bg-gray-50">{selected?.jenis_surat}</div>
              </div>
            </div>

            {/* Isi Surat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Isi Surat</label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200 text-gray-400">
                  <Bold size={14} /><Italic size={14} /><Underline size={14} />
                  <span className="w-px h-4 bg-gray-200" />
                  <span className="text-xs font-semibold">H1</span>
                  <span className="text-xs font-semibold">H2</span>
                  <span className="w-px h-4 bg-gray-200" />
                  <List size={14} />
                </div>
                <textarea rows={5} placeholder={'Dengan hormat,\n\nBersama surat ini kami sampaikan...'} className="w-full px-3 py-3 text-sm focus:outline-none text-gray-800 bg-white placeholder:text-gray-300 resize-none" />
              </div>
            </div>

            {/* Lampiran */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lampiran</label>
              <input ref={attachRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
              {attachment ? (
                <div className="flex items-center gap-3 px-4 py-3 border border-emerald-200 bg-emerald-50 rounded-xl">
                  <FileText size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-700 flex-1 truncate">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} className="text-xs text-emerald-500 hover:text-emerald-700">Hapus</button>
                </div>
              ) : (
                <button onClick={() => attachRef.current?.click()} className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors">
                  <Upload size={20} />
                  <span className="text-xs">Seret file ke sini atau klik untuk unggah</span>
                  <span className="text-[10px] text-gray-300">PDF, DOCX, JPG — Maks. 10MB</span>
                </button>
              )}
            </div>

            {/* Alur Persetujuan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alur Persetujuan</label>
              <div className="flex items-center gap-2 px-3 py-3 border border-gray-200 rounded-lg bg-gray-50">
                {APPROVAL_FLOW.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-medium flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-xs text-gray-600 whitespace-nowrap">{s}</span>
                    </div>
                    {i < APPROVAL_FLOW.length - 1 && <ChevronLeft size={12} className="rotate-180 text-gray-300 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button onClick={() => setStep('template')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={14} /> Kembali
            </button>
            <div className="flex items-center gap-3">
              {submitError && <p className="text-xs text-red-500 max-w-[200px] text-right">{submitError}</p>}
              <button className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors shrink-0">Simpan Draft</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-colors shrink-0"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {submitting ? 'Mengirim...' : 'Kirim untuk Disetujui'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Kanan: Pratinjau PDF + Import CSV ─── */}
        <div>
          {/* Header panel */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pratinjau Surat</p>
            <div>
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              <button
                onClick={() => csvRef.current?.click()}
                disabled={csvLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors disabled:opacity-50"
              >
                {csvLoading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} className="text-emerald-600" />}
                {csvLoading ? 'Memproses...' : 'Import CSV'}
              </button>
            </div>
          </div>

          {/* CSV filename */}
          {csvFileName && <p className="text-xs text-gray-400 mb-2 truncate">File: {csvFileName}</p>}

          {/* CSV status message */}
          {csvMsg && (
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg mb-2 ${csvMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {csvMsg.type === 'success' ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
              <span>{csvMsg.text}</span>
            </div>
          )}

          {/* ─── CSV Row Picker ─── */}
          {showCsvPicker && csvRows.length > 0 && (
            <div className="mb-3 border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                <p className="text-xs font-semibold text-emerald-700">
                  Pilih nomor baris data ({csvRows.length} baris)
                </p>
                <button onClick={() => setShowCsvPicker(false)}>
                  <X size={13} className="text-emerald-400 hover:text-emerald-700" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white">
                {csvRows.map((row, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectCsvRow(index)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 text-left transition-colors"
                  >
                    {/* Nomor baris */}
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    {/* Preview 3 kolom pertama */}
                    <span className="text-xs text-gray-600 truncate flex-1">
                      {csvHeaders.slice(0, 3).map((h) => row[h] || '—').join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Pratinjau PDF via iframe ─── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white" style={{ minHeight: '620px' }}>
            {loadingPreview && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-300 gap-3">
                <Loader2 size={22} className="animate-spin" />
                <p className="text-xs text-gray-400">Membuat pratinjau...</p>
                <p className="text-[10px] text-gray-300">DOCX → PDF via LibreOffice</p>
              </div>
            )}

            {!loadingPreview && previewError && (
              <div className="p-5">
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-0.5">Pratinjau tidak tersedia</p>
                    <p className="text-amber-600">{previewError}</p>
                  </div>
                </div>
              </div>
            )}

            {!loadingPreview && !previewError && !pdfUrl && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <FileText size={28} className="mb-2" />
                <p className="text-xs italic text-center px-4">
                  Pratinjau PDF akan muncul setelah template dipilih
                </p>
              </div>
            )}

            {/* PDF iframe — browser render native, fidelitas 100% */}
            {pdfUrl && !loadingPreview && (
              <iframe
                key={pdfUrl}           /* key agar iframe reload saat URL berubah */
                src={pdfUrl}
                title="Pratinjau Surat"
                style={{ width: '100%', height: '620px', border: 'none', display: 'block' }}
              />
            )}
          </div>

          <p className="text-[10px] text-gray-400 mt-2 text-center">
            PDF dirender via LibreOffice · Update 0.9 detik setelah input berubah
          </p>
        </div>

      </div>
    </PageShell>
  );
}

// ─── Shell ───
function PageShell({ step, children }: { step: 1 | 2 | 3; children: React.ReactNode }) {
  const navigate = useNavigate();
  const steps = [
    { n: 1, label: 'Pilih Template' },
    { n: 2, label: 'Isi Konten' },
    { n: 3, label: 'Review & Kirim' },
  ];
  return (
    <Base>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        <button onClick={() => navigate('/dashboard')} className="hover:text-gray-600">Dashboard</button>
        <span>›</span><span>Buat Surat Baru</span>
        {step > 1 && <><span>›</span><span className="text-gray-600">{steps[step - 1].label}</span></>}
      </div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Buat Surat Baru</h1>
      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${s.n < step ? 'bg-emerald-500 text-white' : s.n === step ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {s.n < step ? <Check size={13} /> : s.n}
              </span>
              <span className={`text-sm whitespace-nowrap ${s.n === step ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px mx-3 ${s.n < step ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      {children}
    </Base>
  );
}