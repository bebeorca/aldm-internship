import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { letterService, userService } from '../../services/api';
import type { Letter } from '../../types';
import Base from '~/components/ui/Base';

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending_approval: { text: 'Menunggu Persetujuan', className: 'bg-amber-100 text-amber-700' },
  approved: { text: 'Disetujui', className: 'bg-emerald-100 text-emerald-700' },
  revision: { text: 'Perlu Revisi', className: 'bg-amber-100 text-amber-700' },
  rejected: { text: 'Ditolak', className: 'bg-red-100 text-red-700' },
  draft: { text: 'Draft', className: 'bg-slate-100 text-slate-700' },
};

const APPROVAL_FLOW = [
  { title: 'Admin Tata Usaha', sub: 'Budi Santoso', status: 'done' },
  { title: 'Kepala Departemen', sub: 'Ir. Bambang Sulistyo', status: 'current' },
  { title: 'Direktur', sub: 'Dr. Hj. Sari Dewi Pratiwi', status: 'pending' },
];

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getDataField(data: Record<string, any> | undefined, ...keys: string[]) {
  if (!data) return undefined;
  const normalized: Record<string, any> = {};
  for (const k of Object.keys(data)) normalized[k.toLowerCase()] = data[k];
  for (const key of keys) {
    const v1 = data[key];
    if (v1 !== undefined && v1 !== null && String(v1).trim() !== '') return v1;
    const v2 = normalized[key.toLowerCase()];
    if (v2 !== undefined && v2 !== null && String(v2).trim() !== '') return v2;
  }
  return undefined;
}

export default function LetterDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [letter, setLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);
    letterService.getById(Number(id))
      .then((res) => setLetter(res.data?.data ?? res.data))
      .catch((err) => {
        setError(err.response?.status === 401 ? 'Akses tidak sah. Silakan login ulang.' : 'Gagal memuat detail surat.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!letter || letter.status !== 'approved') {
      setSignatureUrl(null);
      return;
    }

    userService.getSignature()
      .then((res) => {
        const path = res.data?.data?.signature_path;
        if (path) {
          setSignatureUrl(`/storage/${path}`);
        } else {
          setSignatureUrl(null);
        }
      })
      .catch(() => {
        setSignatureUrl(null);
      });
  }, [letter]);

  const handleExportPdf = async () => {
    if (!letter) return;
    setExporting(true);
    try {
      const response = await letterService.exportDoc(letter.id, 'pdf');
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${letter.nomor_surat || 'surat'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  const handleExportDocx = async () => {
    if (!letter) return;
    setExporting(true);
    try {
      const response = await letterService.exportDoc(letter.id, 'docx');
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${letter.nomor_surat || 'surat'}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Base>
        <div className="py-20 text-center text-slate-500">Memuat detail surat...</div>
      </Base>
    );
  }

  if (!letter) {
    return (
      <Base>
        <div className="py-20 text-center text-slate-500">
          {error ?? 'Surat tidak ditemukan.'}
        </div>
      </Base>
    );
  }

  const status = STATUS_LABELS[letter.status] ?? STATUS_LABELS.draft;
  const subject = getDataField(letter.data_surat, 'hal', 'perihal', 'judul') ?? '—';
  const tanggal = getDataField(letter.data_surat, 'tanggal') || letter.created_at;
  const penerima = getDataField(letter.data_surat, 'kepada') || 'Kepala Divisi Keuangan PT. ALDM';
  const dept = getDataField(letter.data_surat, 'departemen') || 'Keuangan';
  const attachmentPath = getDataField(letter.data_surat, 'lampiran_path', 'attachment_path');
  const attachmentName = getDataField(letter.data_surat, 'lampiran', 'attachment') || attachmentPath?.split('/').pop();

  return (
    <Base>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="text-sm text-slate-500">Dashboard &gt; Surat Keluar &gt; Detail Surat</div>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Detail Surat</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <ArrowLeft size={16} />
                Kembali
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Printer size={16} /> Cetak
              </button>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  disabled={letter.status !== 'approved' || exporting}
                  onClick={handleExportPdf}
                  className={`inline-flex items-center gap-2 rounded-full ${letter.status === 'approved' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-400'} px-4 py-2 text-sm font-semibold transition`}
                >
                  <Download size={16} />
                  {exporting ? 'Mengunduh...' : 'Unduh PDF'}
                </button>
                <button
                  type="button"
                  disabled={letter.status !== 'approved' || exporting}
                  onClick={handleExportDocx}
                  className={`inline-flex items-center gap-2 rounded-full ${letter.status === 'approved' ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-100 text-slate-400'} px-4 py-2 text-sm font-semibold transition`}
                >
                  DOCX
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white grid place-items-center font-semibold">ALDM</div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">PT. ALDM</p>
                    <p className="text-sm text-slate-500">Jl. Sudirman No. 45, Jakarta Pusat 10220</p>
                    <p className="text-sm text-slate-500">Telp. (021) 5551234 · Fax. (021) 5551235</p>
                    <p className="text-sm text-slate-500">www.aldm.co.id · info@aldm.co.id</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
                  <span className="font-semibold">Nomor</span>
                  <span>: {letter.nomor_surat || letter.id}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
                  <span className="font-semibold">Lampiran</span>
                  <span>: {attachmentName || '-'}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
                  <span className="font-semibold">Hal</span>
                  <span>: {subject}</span>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-slate-700">
                <p>{formatDate(tanggal)}</p>
                <p>{penerima}</p>
                <p>di Tempat</p>
              </div>

              <div className="mt-4 space-y-4 text-sm text-slate-700">
                <p>Dengan hormat,</p>
                <p>{letter.data_surat?.isi || 'Dengan hormat, Bersama nota dinas ini kami sampaikan pengajuan anggaran operasional Kuartal III Tahun 2026 untuk kebutuhan Divisi Operasional sebagaimana terlampir. Besar anggaran yang diajukan adalah sebesar Rp 450.000.000,- (Empat Ratus Lima Puluh Juta Rupiah) untuk periode Juli – September 2026. Mohon kiranya dapat disetujui dan diproses lebih lanjut.'}</p>
                <p>Demikian kami sampaikan, atas perhatian Bapak/Ibu kami ucapkan terima kasih.</p>
              </div>

              <div className="text-right text-sm text-slate-700">
                <p className="font-semibold">Hormat kami,</p>
                {signatureUrl && (
                  <div className="mt-4 flex justify-end">
                    <img
                      src={signatureUrl}
                      alt="Tanda tangan direktur"
                      className="h-16 w-auto object-contain"
                      onError={() => setSignatureUrl(null)}
                    />
                  </div>
                )}
                <p className="mt-6 font-semibold">Dr. Hj. Sari Dewi Pratiwi</p>
                <p className="text-slate-500">Direktur Utama · PT. ALDM</p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900 mb-4">Informasi Surat</p>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.text}</span>
                </div>
                <div className="flex items-center justify-between"><span>ID</span><span className="text-slate-900">{letter.id}</span></div>
                <div className="flex items-center justify-between"><span>Nomor</span><span className="text-slate-900">{letter.nomor_surat || '-'}</span></div>
                <div className="flex items-center justify-between"><span>Jenis</span><span className="text-slate-900">{letter.template?.nama || 'Nota Dinas'}</span></div>
                <div className="flex items-center justify-between"><span>Pembuat</span><span className="text-slate-900">{letter.creator?.nama || '—'}</span></div>
                <div className="flex items-center justify-between"><span>Departemen</span><span className="text-slate-900">{dept}</span></div>
                <div className="flex items-center justify-between"><span>Tanggal</span><span className="text-slate-900">{formatDate(tanggal)}</span></div>
              </div>
            </div>

            { (letter.status === 'rejected' || letter.status === 'revision') && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900 mb-4">Catatan Direktur</p>
                <div className="text-sm text-slate-700">
                  {letter.catatan_reject || letter.latest_approval?.catatan ? (
                    <p className="whitespace-pre-wrap">{letter.catatan_reject || letter.latest_approval?.catatan}</p>
                  ) : (
                    <p className="text-slate-400">Tidak ada catatan.</p>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900 mb-4">Alur Persetujuan</p>
              <div className="space-y-4">
                {APPROVAL_FLOW.map((step, index) => (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`grid h-9 w-9 place-items-center rounded-full ${
                        step.status === 'done'
                          ? 'bg-emerald-600 text-white'
                          : step.status === 'current'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {step.status === 'done' ? '✓' : index + 1}
                      </div>
                      {index < APPROVAL_FLOW.length - 1 && <div className="h-full w-px bg-slate-200" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="text-sm text-slate-500">{step.sub}</p>
                      <p className={`text-sm ${step.status === 'done' ? 'text-emerald-700' : step.status === 'current' ? 'text-amber-700' : 'text-slate-400'}`}>
                        {step.status === 'done' ? 'Selesai' : step.status === 'current' ? 'Menunggu tindakan' : 'Belum dimulai'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Base>
  );
}
