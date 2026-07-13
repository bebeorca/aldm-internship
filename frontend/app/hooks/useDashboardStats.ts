import { useEffect, useState } from 'react';
import { letterService, templateService } from '../services/api';
import type { Letter, Template } from '../types';

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface UseDashboardStatsReturn {
  stats: DashboardStats;
  recentLetters: Letter[];
  templates: Template[];
  loading: boolean;
  error: string;
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0, pending: 0, approved: 0, rejected: 0,
  });
  const [recentLetters, setRecentLetters] = useState<Letter[]>([]);
  const [templates, setTemplates]         = useState<Template[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  useEffect(() => {
    // Fetch semua data paralel
    Promise.all([
      letterService.getAll(),           // semua surat
      templateService.getAll(),         // semua template
    ])
      .then(([lettersRes, templatesRes]) => {
        const letters: Letter[] = lettersRes.data.data ?? [];

        // Hitung stats dari data yang ada
        const total    = letters.length;
        const pending  = letters.filter((l) => l.status === 'pending_approval').length;
        const approved = letters.filter((l) => l.status === 'approved').length;
        const rejected = letters.filter((l) => l.status === 'rejected').length;

        setStats({ total, pending, approved, rejected });
        // 5 surat terbaru untuk tabel recent
        setRecentLetters(letters.slice(0, 5));
        setTemplates(templatesRes.data.data ?? []);
      })
      .catch(() => setError('Gagal memuat data dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  return { stats, recentLetters, templates, loading, error };
}