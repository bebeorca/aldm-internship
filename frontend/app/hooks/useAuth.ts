import { useEffect, useState } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Route yang benar di backend adalah GET /api/user (bukan /auth/me)
    api.get('/user')
      .then((res) => setUser(res.data ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}