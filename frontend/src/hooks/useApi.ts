import { useState, useEffect } from 'react';
import { api } from '../api';

interface UseApiOptions {
  autoLoad?: boolean;
  refreshInterval?: number;
}

export function useApi<T>(endpoint: string, options: UseApiOptions = {}) {
  const { autoLoad = true, refreshInterval } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const result = await api.get(endpoint);
      setData(result);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [endpoint, autoLoad]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(load, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return { data, loading, error, reload: load };
}
