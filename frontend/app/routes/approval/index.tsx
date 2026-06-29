// src/routes/approval/index.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle, XCircle, Clock, Loader2, FileText, ChevronRight } from 'lucide-react';
import { letterService } from '../../services/api';
import type { Letter } from '../../types';
import ScreenHeader from '~/components/ui/ScreenHeader';
import Base from '~/components/ui/Base';

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

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
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
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
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

  const fetchPending = () => {
    setLoading(true);
    letterService
      .getAll({ status: 'pending_approval' })
      .then((res) => setLetters(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPending(); }, []);

  const handleDone = () => {
    setSelected(null);
    fetchPending();
  };

  return (
    <Base>
      {/* Header */}
      <ScreenHeader title="Approval Surat" description="Surat menunggu persetujuan Anda" />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Memuat daftar surat...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && letters.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <CheckCircle size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Tidak ada surat yang menunggu persetujuan.</p>
        </div>
      )}

      {/* List */}
      {!loading && letters.length > 0 && (
        <div className="space-y-3">
          {letters.map((letter) => (
            <div
              key={letter.id}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-200 hover:shadow-sm transition-all"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-amber-500" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {letter.nomor_surat}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full shrink-0">
                    <Clock size={10} />
                    Menunggu
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {letter.template?.nama} · Dibuat oleh {letter.creator?.nama ?? '—'}
                </p>
              </div>

              {/* Action */}
              <button
                onClick={() => setSelected(letter)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
              >
                Review
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

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
