// src/routes/approval/index.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle,
  Eye,
  XCircle,
  Clock,
  Loader2,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { letterService } from '../../services/api';
import type { Letter } from '../../types';
import ScreenHeader from '~/components/ui/ScreenHeader';
import Base from '~/components/ui/Base';

const FILTERS = ['Semua', 'Hari Ini', 'Minggu Ini'] as const;

type FilterType = (typeof FILTERS)[number];

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getLetterTitle(letter: Letter) {
  return (
    letter.data_surat.hal ||
    letter.data_surat.perihal ||
    letter.data_surat.judul ||
    letter.data_surat.subjek ||
    letter.template?.nama ||
    letter.nomor_surat
  );
}

function getPriorityTag(letter: Letter) {
  const raw =
    letter.data_surat.prioritas ||
    letter.data_surat.priority ||
    letter.data_surat.mendesak ||
    letter.data_surat.urgent;
  if (!raw) return null;

  const normalized = String(raw).toLowerCase();
  if (normalized.includes('mendesak') || normalized.includes('urgent')) {
    return 'Mendesak';
  }

  return 'Prioritas';
}

// Modal Approve/Reject
function ReviewModal({
  letter,
  onClose,
  onDone,
}: {
  letter: Letter;
  onClose: () => void;
  onDone: () => void;
}) {
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !catatan.trim()) {
      setError('Catatan wajib diisi saat menolak surat.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (action === 'approve') {
        await letterService.approve(letter.id, catatan);
      } else {
        await letterService.reject(letter.id, catatan);
      }
      onDone();
    } catch {
      setError('Gagal memproses. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Review Surat</h2>
          <p className="text-sm text-gray-400 mt-0.5">{letter.nomor_surat}</p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Info surat */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            {Object.entries(letter.data_surat).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-sm">
                <span className="text-gray-400 capitalize w-32 shrink-0">
                  {k.replace(/_/g, ' ')}
                </span>
                <span className="text-gray-700">{v}</span>
              </div>
            ))}
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Catatan <span className="text-gray-400 font-normal">(wajib jika ditolak)</span>
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan untuk pembuat surat..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder:text-gray-300"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => handle('reject')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <XCircle size={14} />
            Tolak
          </button>
          <button
            onClick={() => handle('approve')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Setujui
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Page
export default function ApprovalPage() {
  const navigate = useNavigate();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('Semua');

  const priorityLetters = useMemo(
    () => letters.filter((letter) => Boolean(getPriorityTag(letter))),
    [letters]
  );

  const filteredLetters = useMemo(() => {
    if (activeFilter === 'Semua') return letters;
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay() || 7;
    startOfWeek.setDate(now.getDate() - (day - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return letters.filter((letter) => {
      const date = new Date(letter.created_at);
      if (activeFilter === 'Hari Ini') {
        return date.toDateString() === now.toDateString();
      }
      return date >= startOfWeek && date <= endOfWeek;
    });
  }, [activeFilter, letters]);

  const fetchPending = () => {
    setLoading(true);
    letterService
      .getAll({ status: 'pending_approval' })
      .then((res) => setLetters(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleDone = () => {
    setSelected(null);
    fetchPending();
  };

  return (
    <Base>
      <div className="space-y-6">
        <ScreenHeader title="Approval Surat" description="Surat menunggu persetujuan Anda" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    activeFilter === filter
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              {filteredLetters.length} surat ditampilkan
            </div>
          </div>

          {priorityLetters.length > 0 && (
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Surat Prioritas / Mendesak</p>
                  <p className="text-sm text-amber-700">Terdapat {priorityLetters.length} surat yang ditandai prioritas</p>
                </div>
                <div className="rounded-full bg-white px-3 py-2 text-xs font-medium text-amber-800 border border-amber-100">
                  {priorityLetters.length} prioritas aktif
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">Memuat daftar surat...</span>
            </div>
          )}

          {!loading && filteredLetters.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tidak ada surat yang sesuai filter.</p>
            </div>
          )}

          {!loading && filteredLetters.length > 0 && (
            <div className="grid gap-4">
              {filteredLetters.map((letter) => {
                const priorityTag = getPriorityTag(letter);
                return (
                  <article
                    key={letter.id}
                    className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-200"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {priorityTag && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 border border-amber-100">
                              <Clock size={12} />
                              {priorityTag}
                            </span>
                          )}
                          <span className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500">
                            {letter.nomor_surat}
                          </span>
                        </div>
                        <h2 className="mt-4 text-lg font-semibold text-gray-900 truncate">
                          {getLetterTitle(letter)}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                          Diajukan oleh {letter.creator?.nama ?? '—'} · {formatDate(letter.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelected(letter)}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-emerald-200 hover:text-emerald-600 transition"
                        >
                          <Eye size={14} />
                          Lihat detail
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelected(letter)}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          <CheckCircle size={14} />
                          Review
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <ReviewModal
          letter={selected}
          onClose={() => setSelected(null)}
          onDone={handleDone}
        />
      )}
    </Base>
  );
}
