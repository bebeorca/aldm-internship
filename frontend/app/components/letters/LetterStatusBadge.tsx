// src/components/letters/LetterStatusBadge.tsx
import type { LetterStatus } from '../../types';

const STATUS_MAP: Record<LetterStatus, { label: string; className: string }> = {
  draft:            { label: 'Draft',     className: 'bg-gray-100 text-gray-500' },
  pending_approval: { label: 'Menunggu',  className: 'bg-amber-50 text-amber-600' },
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