// src/hooks/useClinicStats.ts - Hook to calculate clinic statistics
import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '@/redux/hooks/useAppSelector';

interface ClinicStats {
  totalPatients: number;
  todayNewPatients: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

interface UseClinicStatsProps {
  clinicId?: string;
  refreshInterval?: number; // in milliseconds, default 5 minutes
}

export const useClinicStats = ({ 
  clinicId, 
  refreshInterval = 5 * 60 * 1000 // 5 minutes default
}: UseClinicStatsProps = {}): ClinicStats => {
  const [stats, setStats] = useState<ClinicStats>({
    totalPatients: 0,
    todayNewPatients: 0,
    totalPages: 0,
    isLoading: false,
    error: null,
  });

  // Get current pagination data from Redux (if available)
  const patientsState = useAppSelector((state) => state.patients);
  const pagination = patientsState.pagination;

  const fetchClinicStats = useCallback(async () => {
    if (!clinicId) {
      setStats(prev => ({
        ...prev,
        totalPatients: 0,
        todayNewPatients: 0,
        totalPages: 0,
        isLoading: false,
        error: null,
      }));
      return;
    }

    setStats(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('Fetching clinic stats for:', clinicId);

      // Fetch basic patient statistics
      const response = await fetch(`/api/clinic/${clinicId}/stats`);
      
      if (!response.ok) {
        // If the stats endpoint doesn't exist, fallback to using pagination data
        console.log('Stats endpoint not available, using pagination data');
        
        setStats(prev => ({
          ...prev,
          totalPatients: pagination?.totalItems || 0,
          todayNewPatients: 0, // Will need to be calculated separately
          totalPages: pagination?.totalPages || 0,
          isLoading: false,
          lastUpdated: new Date(),
        }));
        return;
      }

      const data = await response.json();

      if (data.success) {
        setStats({
          totalPatients: data.stats.totalPatients || 0,
          todayNewPatients: data.stats.todayNewPatients || 0,
          totalPages: data.stats.totalPages || 0,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } else {
        // Fallback to pagination data if stats API fails
        setStats(prev => ({
          ...prev,
          totalPatients: pagination?.totalItems || 0,
          todayNewPatients: 0,
          totalPages: pagination?.totalPages || 0,
          isLoading: false,
          error: data.error || 'Failed to fetch stats',
          lastUpdated: new Date(),
        }));
      }
    } catch (error: any) {
      console.error('Error fetching clinic stats:', error);
      
      // Fallback to using existing Redux pagination data
      setStats(prev => ({
        ...prev,
        totalPatients: pagination?.totalItems || 0,
        todayNewPatients: 0,
        totalPages: pagination?.totalPages || 0,
        isLoading: false,
        error: error.message || 'Failed to fetch clinic statistics',
        lastUpdated: new Date(),
      }));
    }
  }, [clinicId, pagination]);

  // Update stats when pagination changes (immediate feedback)
  useEffect(() => {
    if (pagination && clinicId) {
      setStats(prev => ({
        ...prev,
        totalPatients: pagination.totalItems,
        totalPages: pagination.totalPages,
        lastUpdated: new Date(),
      }));
    }
  }, [pagination, clinicId]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (clinicId) {
      fetchClinicStats();

      // Set up periodic refresh if refreshInterval is provided
      if (refreshInterval > 0) {
        const interval = setInterval(fetchClinicStats, refreshInterval);
        return () => clearInterval(interval);
      }
    }
  }, [clinicId, fetchClinicStats, refreshInterval]);

  return stats;
};

export default useClinicStats;