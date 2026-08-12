import { useMemo } from 'react';

import { env } from '@/config/env';
import { getStaticStudents } from '@/data/staticData';
import { fetchDashboardHoursTotal } from '@/services/dashboard';
import { fetchStudentsWithMeta } from '@/services/students';
import { fetchReportKpis, fetchSessionsTotalForDateRange } from '@/services/sessions';
import { useSessions } from '@/hooks/useSessions';
import { useDashboardPeriodStore } from '@/store/dashboardPeriodStore';
import type { DashboardKpis } from '@/types/dashboard';
import { getDashboardPeriodDateBounds, getSessionsInPeriod } from '@/utils/dashboardPeriod';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useCompanyStore } from '@/store/companyStore';

export function useDashboardKpis(): {
  data: DashboardKpis;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
} {
  const { user } = useAuth();
  const studentsRoleKey = useCompanyStore((s) => s.roleCodes.join('|'));
  const { data: sessions, isLoading: sessionsLoading, isRefetching: sessionsRefetching, error: sessionsError, refetch: refetchSessions } = useSessions();
  const apiOrStaticEnabled = (!!env.apiUrl || env.useStaticData) && !!user;
  const { data: reportKpis, isLoading: kpisLoading, isRefetching: kpisRefetching, error: kpisError, refetch: refetchKpis } = useQuery({
    queryKey: ['sessions', 'report-kpis'],
    queryFn: fetchReportKpis,
    enabled: apiOrStaticEnabled,
    placeholderData: (prev) => prev,
  });
  const useApiStudents = !!env.apiUrl && !env.useStaticData && !!user;
  const { data: studentsFetch } = useQuery({
    queryKey: ['students', studentsRoleKey],
    queryFn: fetchStudentsWithMeta,
    enabled: useApiStudents,
    placeholderData: (prev) => prev,
  });
  const { dashboardPeriod } = useDashboardPeriodStore();
  const periodDates = useMemo(() => getDashboardPeriodDateBounds(dashboardPeriod), [dashboardPeriod]);
  const useApiHours = !!env.apiUrl && !env.useStaticData && !!user;
  const {
    data: hoursTotal,
    isLoading: hoursLoading,
    isRefetching: hoursRefetching,
    error: hoursError,
    refetch: refetchHours,
  } = useQuery({
    queryKey: ['sessions', 'hours-total', periodDates.dateFrom, periodDates.dateTo],
    queryFn: () => fetchDashboardHoursTotal(periodDates.dateFrom, periodDates.dateTo),
    enabled: useApiHours,
    placeholderData: (prev) => prev,
  });
  /** Total serveur (tuteur + visibilité) sur la période — évite le plafond des 100 premières séances. */
  const useApiSessionsPeriodTotal = !!env.apiUrl && !env.useStaticData && !!user;
  const {
    data: sessionsPeriodTotal,
    isLoading: sessionsPeriodTotalLoading,
    isRefetching: sessionsPeriodTotalRefetching,
    error: sessionsPeriodTotalError,
    refetch: refetchSessionsPeriodTotal,
  } = useQuery({
    queryKey: ['sessions', 'period-total', periodDates.dateFrom, periodDates.dateTo],
    queryFn: () => fetchSessionsTotalForDateRange(periodDates.dateFrom, periodDates.dateTo),
    enabled: useApiSessionsPeriodTotal,
    placeholderData: (prev) => prev,
  });

  const data = useMemo((): DashboardKpis => {
    const sessionList = Array.isArray(sessions) ? sessions : [];
    const inPeriod = getSessionsInPeriod(sessionList, dashboardPeriod);
    let studentsCount = 0;
    if (env.useStaticData) studentsCount = getStaticStudents().length;
    else if (useApiStudents && studentsFetch) studentsCount = studentsFetch.total;
    const missing = reportKpis?.missingReports ?? 0;
    const overdue = reportKpis?.overdueReports ?? 0;
    const pendingSaisie = reportKpis?.pendingReports ?? overdue;
    const sessionsCount = env.useStaticData
      ? inPeriod.length
      : useApiSessionsPeriodTotal && sessionsPeriodTotal != null
        ? sessionsPeriodTotal
        : inPeriod.length;
    return {
      sessionsCount,
      studentsCount,
      crCompleted: reportKpis?.validatedReports ?? 0,
      crLate: overdue,
      crToSubmit: missing + pendingSaisie,
      hoursValidated: env.useStaticData ? 12 : (hoursTotal ?? 0),
    };
  }, [
    sessions,
    dashboardPeriod,
    reportKpis,
    useApiStudents,
    studentsFetch,
    hoursTotal,
    useApiSessionsPeriodTotal,
    sessionsPeriodTotal,
  ]);

  const useKpis = env.apiUrl || env.useStaticData;
  const isLoading = useKpis
    ? sessionsLoading ||
      kpisLoading ||
      (useApiHours ? hoursLoading : false) ||
      (useApiSessionsPeriodTotal ? sessionsPeriodTotalLoading : false)
    : sessionsLoading;
  const isRefetching = useKpis
    ? sessionsRefetching ||
      kpisRefetching ||
      (useApiHours ? hoursRefetching : false) ||
      (useApiSessionsPeriodTotal ? sessionsPeriodTotalRefetching : false)
    : sessionsRefetching;
  const error =
    sessionsError ??
    kpisError ??
    (useApiHours ? hoursError : null) ??
    (useApiSessionsPeriodTotal ? sessionsPeriodTotalError : null) ??
    null;
  const refetch = async () => {
    await Promise.all([
      refetchSessions(),
      useKpis ? refetchKpis() : Promise.resolve(undefined),
      useApiHours ? refetchHours() : Promise.resolve(undefined),
      useApiSessionsPeriodTotal ? refetchSessionsPeriodTotal() : Promise.resolve(undefined),
    ]);
  };

  return { data, isLoading, isRefetching, error, refetch };
}
