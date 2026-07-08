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

    api.get('/user')
      .then((res) => {
        // API returns user object directly, not wrapped in data
        setUser(res.data);
      })
      .catch((err) => {
        console.error('[useAuth] Failed to fetch user:', err.message);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}