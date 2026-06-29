import { useEffect, useState } from 'react';
import { letterService } from '../services/api';

export function usePendingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    letterService
      .getAll({ status: 'pending_approval' })
      .then((res) => setCount(res.data.data.length))
      .catch(() => setCount(0));
  }, []);

  return count;
}