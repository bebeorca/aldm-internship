import { useEffect, useState } from 'react';
import { templateService } from '../services/api';
import type { Template } from '../types';

interface UseTemplatesReturn {
  templates: Template[];
  loading: boolean;
  error: string;
  refetch: () => void;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const fetchTemplates = () => {
    setLoading(true);
    setError('');
    templateService
      .getAll()
      .then((res) => setTemplates(res.data.data))
      .catch(() => setError('Gagal memuat daftar template.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return { templates, loading, error, refetch: fetchTemplates };
}