// src/components/letters/LetterStatusBadge.tsx
import type { LetterStatus } from '../../types';

const STATUS_MAP: Record<LetterStatus, { label: string; className: string }> = {
  draft:            { label: 'Perlu Revisi',     className: 'bg-amber-100 text-amber-700' },
  pending_approval: { label: 'Menunggu',  className: 'bg-amber-50 text-amber-600' },
  revision:         { label: 'Perlu Revisi', className: 'bg-amber-100 text-amber-700' },
  approved:         { label: 'Disetujui', className: 'bg-emerald-50 text-emerald-600' },
  rejected:         { label: 'Ditolak',   className: 'bg-red-50 text-red-500' },
};

interface Props {
  status: LetterStatus;
}

export default function LetterStatusBadge({ status }: Props) {
  const { label, className } = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}