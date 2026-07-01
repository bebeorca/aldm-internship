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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
  templateService.getAll()
    .then((templatesRes) => {
      // sementara letters kosong
      const letters: Letter[] = [];

      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      });

      setRecentLetters([]);
      setTemplates(templatesRes.data.data);
    })
    .catch(() => setError('Gagal memuat data dashboard.'))
    .finally(() => setLoading(false));
}, []);

  return { stats, recentLetters, templates, loading, error };
}