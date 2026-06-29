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
    Promise.all([
      letterService.getAll(),
      templateService.getAll(),
    ])
      .then(([lettersRes, templatesRes]) => {
        const letters: Letter[] = lettersRes.data.data;
        setStats({
          total:    letters.length,
          pending:  letters.filter((l) => l.status === 'pending_approval').length,
          approved: letters.filter((l) => l.status === 'approved').length,
          rejected: letters.filter((l) => l.status === 'rejected').length,
        });
        setRecentLetters(letters.slice(0, 5));
        setTemplates(templatesRes.data.data);
      })
      .catch(() => setError('Gagal memuat data dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  return { stats, recentLetters, templates, loading, error };
}