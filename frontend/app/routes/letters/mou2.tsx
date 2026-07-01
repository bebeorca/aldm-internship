import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ChevronLeft, Loader2, FileText, Upload, Tag,
  CheckCircle2, AlertCircle, Check, Bold, Italic, Underline, List,
} from 'lucide-react';
import mammoth from 'mammoth';
import { templateService } from '../../services/api';
import type { Template } from '../../types';
import Base from '~/components/ui/Base';
import ErrorAlert from '~/components/ui/ErrorAlert';

type Step = 'template' | 'form';

const APPROVAL_FLOW = ['Admin TU', 'Kepala Dept.', 'Direktur'];

/** Substitusi {{key}} di HTML dengan nilai dari formData — update real-time */
function substituteVars(html: string, data: Record<string, string>): string {
  let result = html;
  Object.entries(data).forEach(([key, val]) => {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(
      re,
      val
        ? `<span style="color:#065f46;font-weight:600">${val}</span>`
        : `<span style="color:#d1d5db;font-style:italic">{{${key}}}</span>`
    );
  });
  return result;
}

/** Parse baris pertama CSV sebagai header, baris kedua sebagai nilai */
function parseCsv(text: string): Record<string, string> {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return {};
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const values  = lines[1].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
  const result: Record<string, string> = {};
  headers.forEach((h, i) => { result[h] = values[i] ?? ''; });
  return result;
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MouTwoPage() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const csvRef        = useRef<HTMLInputElement>(null);
  const attachRef     = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('template');

  // Template list (step 1)
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError]   = useState('');

  // Selected template + form (step 2)
  const [selected, setSelected]       = useState<Template | null>(null);
  const [formData, setFormData]       = useState<Record<string, string>>({});
  const [attachment, setAttachment]   = useState<File | null>(null);

  // Mammoth preview
  const [baseHtml, setBaseHtml]           = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // CSV
  const [csvFileName, setCsvFileName] = useState('');
  const [csvLoading, setCsvLoading]   = useState(false);
  const [csvMsg, setCsvMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load template list
  useEffect(() => {
    templateService.getAll()
      .then((res) => setTemplates(res.data.data ?? []))
      .catch(() => setListError('Gagal memuat daftar template.'))
      .finally(() => setLoadingList(false));
  }, []);

  // Jika URL punya ?template_id=X → langsung load template dan masuk ke form
  useEffect(() => {
    const tid = searchParams.get('template_id');
    if (!tid) return;
    templateService.getById(Number(tid))
      .then((res) => selectTemplate(res.data.data))
      .catch(() => setListError('Template tidak ditemukan.'));
  }, []);

  // Ketika template dipilih: fetch file .docx dan convert dengan mammoth
  useEffect(() => {
    if (!selected?.path_docx || selected.path_docx === 'templates/placeholder.docx') {
      // Fallback: gunakan raw_content dari DB jika ada
      if (selected?.raw_content) {
        const escapedHtml = selected.raw_content
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        setBaseHtml(`<p>${escapedHtml.replace(/\n/g, '</p><p>')}</p>`);
      }
      return;
    }

    setLoadingPreview(true);
    setBaseHtml('');

    fetch(`/storage/${selected.path_docx}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then((result) => setBaseHtml(result.value))
      .catch(() => {
        // Fallback ke raw_content dari DB
        if (selected.raw_content) {
          const esc = selected.raw_content
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          setBaseHtml(`<p>${esc.replace(/\n/g, '</p><p>')}</p>`);
        } else {
          setBaseHtml('<p style="color:#d1d5db;font-style:italic">Pratinjau tidak tersedia.</p>');
        }
      })
      .finally(() => setLoadingPreview(false));
  }, [selected]);

  const selectTemplate = (tpl: Template) => {
    setSelected(tpl);
    const initial: Record<string, string> = {};
    tpl.variabel.forEach((v) => (initial[v] = ''));
    setFormData(initial);
    setCsvMsg(null);
    setCsvFileName('');
    setStep('form');
  };

  const handleFieldChange = (key: string, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  // Parse CSV sepenuhnya di frontend — tidak memanggil backend
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvLoading(true);
    setCsvMsg(null);

    try {
      const text    = await file.text();
      const csvData = parseCsv(text);

      if (Object.keys(csvData).length === 0) {
        throw new Error('Format CSV tidak valid. Minimal: 1 baris header + 1 baris data.');
      }

      // Hitung berapa field form yang cocok dengan kolom CSV
      const matchedKeys = Object.keys(formData).filter((k) => csvData[k] !== undefined);

      setFormData((prev) => {
        const updated = { ...prev };
        matchedKeys.forEach((k) => { updated[k] = csvData[k]; });
        return updated;
      });

      if (matchedKeys.length === 0) {
        setCsvMsg({ type: 'error', text: 'Tidak ada kolom CSV yang cocok dengan variabel template ini.' });
      } else {
        setCsvMsg({ type: 'success', text: `${matchedKeys.length} field berhasil diisi dari CSV.` });
      }
    } catch (err: any) {
      setCsvMsg({ type: 'error', text: err.message || 'Gagal membaca file CSV.' });
    } finally {
      setCsvLoading(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  };

  // Preview HTML dengan substitusi live setiap kali formData berubah
  const liveHtml = useMemo(() => {
    if (!baseHtml) return '';
    return substituteVars(baseHtml, formData);
  }, [baseHtml, formData]);

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
            <p className="text-sm">Belum ada template tersedia.</p>
            <button
              onClick={() => navigate('/dashboard/templates/new')}
              className="mt-3 text-xs text-emerald-600 hover:underline"
            >
              Tambah template pertama →
            </button>
          </div>
        )}

        {!loadingList && !listError && templates.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
              >
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
                        <span key={v} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                          {`{{${v}}}`}
                        </span>
                      ))}
                      {tpl.variabel.length > 2 && (
                        <span className="text-[10px] text-gray-400">+{tpl.variabel.length - 2} lagi</span>
                      )}
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

        {/* ─── Kiri: Form Isi Surat ─── */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Informasi Surat</h2>
          </div>

          <div className="p-6 space-y-5">

            {/* Nomor Surat otomatis */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {formatLabel(key)}
                </label>
                <input
                  type="text"
                  value={formData[key] ?? ''}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  placeholder={`Masukkan ${formatLabel(key).toLowerCase()}`}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 transition text-gray-800 bg-white placeholder:text-gray-300"
                />
              </div>
            ))}

            {/* Tanggal + Jenis Surat */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Surat</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-800 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis Surat</label>
                <div className="px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg bg-gray-50">
                  {selected?.jenis_surat}
                </div>
              </div>
            </div>

            {/* Isi Surat (field tambahan bebas, tidak terkait variabel template) */}
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
                <textarea
                  rows={5}
                  placeholder={'Dengan hormat,\n\nBersama surat ini kami sampaikan...'}
                  className="w-full px-3 py-3 text-sm focus:outline-none text-gray-800 bg-white placeholder:text-gray-300 resize-none"
                />
              </div>
            </div>

            {/* Lampiran */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lampiran</label>
              <input
                ref={attachRef}
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              />
              {attachment ? (
                <div className="flex items-center gap-3 px-4 py-3 border border-emerald-200 bg-emerald-50 rounded-xl">
                  <FileText size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-700 flex-1 truncate">{attachment.name}</span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="text-xs text-emerald-500 hover:text-emerald-700"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => attachRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors"
                >
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
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-medium flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs text-gray-600 whitespace-nowrap">{s}</span>
                    </div>
                    {i < APPROVAL_FLOW.length - 1 && (
                      <ChevronLeft size={12} className="rotate-180 text-gray-300 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => setStep('template')}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft size={14} /> Kembali
            </button>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
                Simpan Draft
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-colors">
                <Check size={14} /> Kirim untuk Disetujui
              </button>
            </div>
          </div>
        </div>

        {/* ─── Kanan: Pratinjau + Import CSV ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pratinjau Surat</p>
            <div>
              <input
                ref={csvRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvUpload}
              />
              <button
                onClick={() => csvRef.current?.click()}
                disabled={csvLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors disabled:opacity-50"
              >
                {csvLoading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Upload size={13} className="text-emerald-600" />}
                {csvLoading ? 'Memproses...' : 'Import CSV'}
              </button>
            </div>
          </div>

          {csvFileName && (
            <p className="text-xs text-gray-400 mb-2 truncate">File: {csvFileName}</p>
          )}
          {csvMsg && (
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg mb-3 ${
              csvMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {csvMsg.type === 'success'
                ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
              <span>{csvMsg.text}</span>
            </div>
          )}

          {/* Kop surat + Pratinjau live */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="px-5 py-4 border-b-2 border-emerald-600 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-900 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                ALDM
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">PT. ALDM</p>
                <p className="text-[10px] text-gray-400 leading-tight">Jl. Sudirman No. 45, Jakarta Pusat 10220</p>
                <p className="text-[10px] text-blue-600">www.aldm.co.id · info@aldm.co.id</p>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="space-y-1 mb-4 text-xs">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-16 shrink-0">Nomor</span>
                  <span className="text-gray-700 font-mono">: {nomorSurat}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-16 shrink-0">Lampiran</span>
                  <span className="text-gray-500">: {attachment?.name || '—'}</span>
                </div>
              </div>

              {/* Pratinjau dari mammoth — update saat user mengetik */}
              {loadingPreview ? (
                <div className="flex items-center gap-2 py-10 text-gray-300 justify-center">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Memuat pratinjau dokumen...</span>
                </div>
              ) : liveHtml ? (
                <div
                  className="text-gray-700 leading-relaxed"
                  style={{ fontSize: '11px', lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: liveHtml }}
                />
              ) : (
                <p className="text-xs text-gray-300 italic py-8 text-center">
                  Pratinjau dokumen akan muncul di sini...
                </p>
              )}

              <div className="mt-6 text-right">
                <p className="text-xs text-gray-500">Hormat kami,</p>
                <div className="mt-8">
                  <p className="text-xs font-bold text-gray-700">Dr. Hj. Sari Dewi Pratiwi</p>
                  <p className="text-[10px] text-gray-400">Direktur Utama · PT. ALDM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}

// ─── Shell: breadcrumb + stepper ───
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
        <span>›</span>
        <span>Buat Surat Baru</span>
        {step > 1 && <><span>›</span><span className="text-gray-600">{steps[step - 1].label}</span></>}
      </div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Buat Surat Baru</h1>

      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                s.n < step ? 'bg-emerald-500 text-white'
                : s.n === step ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-400'
              }`}>
                {s.n < step ? <Check size={13} /> : s.n}
              </span>
              <span className={`text-sm whitespace-nowrap ${s.n === step ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${s.n < step ? 'bg-emerald-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {children}
    </Base>
  );
}