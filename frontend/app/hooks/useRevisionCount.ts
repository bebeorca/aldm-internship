import { useEffect, useState } from 'react';
import { letterService } from '../services/api';

export function useRevisionCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    letterService
      .getAll({ status: 'revision' })
      .then((res) => setCount(res.data.data.length))
      .catch(() => setCount(0));
  }, []);

  return count;
}
