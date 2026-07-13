import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronLeft, Printer, Download, FileText,
  CheckCircle2, Clock, XCircle, Loader2, AlertCircle,
} from 'lucide-react';
import { letterService } from '../../services/api';
import type { Letter } from '../../types';
import Base from '~/components/ui/Base';

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending_approval: { label: 'Menunggu Persetujuan', className: 'bg-amber-100 text-amber-700' },
    approved:         { label: 'Disetujui',             className: 'bg-emerald-100 text-emerald-700' },
    rejected:         { label: 'Ditolak',               className: 'bg-red-100 text-red-600' },
    draft:            { label: 'Draft',                 className: 'bg-gray-100 text-gray-600' },
  };
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.className}`}>{s.label}</span>;
}

function ApprovalStep({ n, title, name, status }: { n: number; title: string; name?: string; status: 'done' | 'current' | 'pending' }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${
        status === 'done' ? 'bg-emerald-500 text-white' :
        status === 'current' ? 'bg-amber-400 text-white' :
        'bg-gray-100 text-gray-400'
      }`}>
        {status === 'done' ? <CheckCircle2 size={14} /> : n}
      </div>
      <div>
        <p className={`text-sm font-medium ${status === 'pending' ? 'text-gray-400' : 'text-gray-700'}`}>{title}</p>
        {name && <p className="text-xs text-gray-400 mt-0.5">{name}</p>}
        <p className={`text-xs mt-0.5 ${
          status === 'done' ? 'text-emerald-500' :
          status === 'current' ? 'text-amber-500' :
          'text-gray-300'
        }`}>
          {status === 'done' ? 'Selesai' : status === 'current' ? 'Menunggu tindakan' : 'Belum dimulai'}
        </p>
      </div>
    </div>
  );
}

export default function LetterDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [letter, setLetter]     = useState<Letter | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // URL PDF yang di-serve oleh backend (tanpa auth — agar iframe bisa load)
  const pdfViewUrl = id ? `/api/letters/${id}/pdf-view#toolbar=0&navpanes=0` : null;

  useEffect(() => {
    if (!id) return;
    letterService.getById(Number(id))
      .then((res) => setLetter(res.data.data ?? res.data))
      .catch((err) => {
        const status = err?.response?.status;
        setError(
          status === 401 ? 'Akses tidak sah. Silakan login ulang.' :
          status === 403 ? 'Anda tidak memiliki izin untuk melihat surat ini.' :
          status === 404 ? 'Surat tidak ditemukan.' :
          'Gagal memuat detail surat.'
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!letter) return;
    setExporting(true);
    setExportError('');
    try {
      const res = await letterService.exportDoc(letter.id, format);
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const blob = new Blob([res.data], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${letter.nomor_surat ?? 'surat'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? `Gagal mengunduh ${format.toUpperCase()}.`;
      setExportError(msg);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Base>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Memuat surat...</span>
        </div>
      </Base>
    );
  }

  if (error) {
    return (
      <Base>
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft size={14} /> Kembali
        </button>
      </Base>
    );
  }

  if (!letter) return null;

  const isApproved = letter.status === 'approved';

  // Tentukan step approval berdasarkan status surat dan latestApproval
  const approvalSteps = [
    { title: 'Admin Tata Usaha', name: letter.creator?.nama },
    { title: 'Kepala Departemen', name: letter.latestApproval?.reviewer?.nama },
    { title: 'Direktur', name: undefined },
  ];
  const approvalStatus = (idx: number): 'done' | 'current' | 'pending' => {
    if (letter.status === 'approved') return 'done';
    if (letter.status === 'rejected') return idx === 0 ? 'done' : idx === 1 ? 'current' : 'pending';
    if (letter.status === 'pending_approval') return idx === 0 ? 'done' : idx === 1 ? 'current' : 'pending';
    return 'pending';
  };

  return (
    <Base>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        <button onClick={() => navigate('/dashboard')} className="hover:text-gray-600">Dashboard</button>
        <span>›</span>
        <button onClick={() => navigate('/letters')} className="hover:text-gray-600">Surat Keluar</button>
        <span>›</span>
        <span className="text-gray-600">Detail Surat</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Detail Surat</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
            <Printer size={14} /> Cetak
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!isApproved || exporting}
            title={!isApproved ? 'Hanya tersedia setelah surat disetujui' : ''}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Unduh PDF
          </button>
          <button
            onClick={() => handleExport('docx')}
            disabled={!isApproved || exporting}
            title={!isApproved ? 'Hanya tersedia setelah surat disetujui' : ''}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FileText size={14} /> DOCX
          </button>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={14} /> Kembali
          </button>
        </div>
      </div>

      {exportError && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">

        {/* ─── Kiri: PDF Pratinjau Surat (Bug 2: real content dari DOCX) ─── */}
        <div className="col-span-2">
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white" style={{ minHeight: '700px' }}>
            {pdfViewUrl ? (
              <iframe
                src={pdfViewUrl}
                title="Isi Surat"
                style={{ width: '100%', height: '700px', border: 'none', display: 'block' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full py-20 text-gray-300">
                <p className="text-sm">Preview tidak tersedia</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Kanan: Info + Approval Flow ─── */}
        <div className="space-y-5">

          {/* Informasi Surat */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Informasi Surat</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-400">Status</span>
                {statusBadge(letter.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Nomor</span>
                <span className="text-xs font-mono text-gray-700">{letter.nomor_surat ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Jenis</span>
                <span className="text-xs text-gray-700">{letter.template?.jenis_surat ?? letter.template_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Template</span>
                <span className="text-xs text-gray-700">{letter.template?.nama ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Pembuat</span>
                <span className="text-xs text-gray-700">{letter.creator?.nama ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Tanggal</span>
                <span className="text-xs text-gray-700">
                  {letter.created_at ? new Date(letter.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Data Surat (variabel yang diisi) */}
          {letter.data_surat && Object.keys(letter.data_surat).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Data Isian</h3>
              <div className="space-y-2">
                {Object.entries(letter.data_surat).map(([key, val]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-xs text-gray-400 w-28 shrink-0 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-700 flex-1">{val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alur Persetujuan */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Alur Persetujuan</h3>
            <div className="space-y-4">
              {approvalSteps.map((s, i) => (
                <ApprovalStep
                  key={i}
                  n={i + 1}
                  title={s.title}
                  name={s.name}
                  status={approvalStatus(i)}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </Base>
  );
}