// src/hooks/useNextHNCode.ts
import { useState, useEffect } from 'react';
import { toIdString } from '@/utils/mongoHelpers';

export const useNextHNCode = (clinicId: string | undefined) => {
  const [nextHNCode, setNextHNCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNextHNCode = async () => {
      if (!clinicId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/clinic/${clinicId}/nextHNCode`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch next HN code');
        }
        
        const data = await response.json();
        setNextHNCode(data.nextHNCode);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch next HN code');
        console.error('Error fetching next HN code:', err);
      } finally {
        setLoading(false);
      }
    };

    if (clinicId) {
      fetchNextHNCode();
    }
  }, [clinicId]);

  return { nextHNCode, loading, error };
};