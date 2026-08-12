/**
 * Centralized route path builders for consistent navigation.
 * Use with router.push() or router.replace().
 */

export const routes = {
  /** Tabs - list screens */
  sessionsList: () => '/(tabs)/sessions' as const,
  comptesRendusList: () => '/(tabs)/comptes-rendus' as const,
  studentsList: () => '/(tabs)/students' as const,

  /** Session flow */
  sessionDetail: (id: string) => `/(tabs)/sessions/${id}` as const,
  sessionRecording: (id: string) => `/(tabs)/sessions/${id}/recording` as const,
  sessionAiProcessing: (id: string, reportId?: string) =>
    reportId
      ? (`/(tabs)/sessions/${id}/ai-processing?reportId=${reportId}` as const)
      : (`/(tabs)/sessions/${id}/ai-processing` as const),
  sessionChat: (id: string) => `/(tabs)/sessions/${id}/chat` as const,
  sessionScript: (id: string, reportId?: string) =>
    reportId
      ? (`/(tabs)/sessions/${id}/script?reportId=${reportId}` as const)
      : (`/(tabs)/sessions/${id}/script` as const),
  sessionResourceDetail: (id: string, index: number, reportId?: string) =>
    reportId
      ? (`/(tabs)/sessions/${id}/resource-detail?index=${index}&reportId=${reportId}` as const)
      : (`/(tabs)/sessions/${id}/resource-detail?index=${index}` as const),
  sessionCreateStudent: (id: string) => `/(tabs)/sessions/${id}/create-student` as const,

  /** Attendance */
  attendanceHistory: () => '/(tabs)/sessions/attendance-history' as const,

  /** CR flow */
  crDetail: (id: string, params?: { sessionId?: string; fromSessionId?: string; returnTo?: string }) => {
    if (!params || (!params.sessionId && !params.fromSessionId && !params.returnTo)) {
      return `/(tabs)/comptes-rendus/${id}` as const;
    }
    const q = new URLSearchParams();
    if (params.sessionId) q.set('sessionId', params.sessionId);
    if (params.fromSessionId) q.set('fromSessionId', params.fromSessionId);
    if (params.returnTo) q.set('returnTo', params.returnTo);
    return `/(tabs)/comptes-rendus/${id}?${q.toString()}` as const;
  },
  crNew: (params?: { sessionId?: string; fromSessionId?: string; reportId?: string }) => {
    if (!params || (!params.sessionId && !params.fromSessionId && !params.reportId)) {
      return '/(tabs)/comptes-rendus/new' as const;
    }
    const q = new URLSearchParams();
    if (params.sessionId) q.set('sessionId', params.sessionId);
    if (params.fromSessionId) q.set('fromSessionId', params.fromSessionId);
    if (params.reportId) q.set('reportId', params.reportId);
    return `/(tabs)/comptes-rendus/new?${q.toString()}` as const;
  },

  /** Students */
  studentDetail: (id: string) => `/(tabs)/students/${id}` as const,

  /** Profile */
  profileEdit: () => '/(tabs)/profile/edit' as const,
  profileClassement: () => '/(tabs)/profile/classement' as const,
  profileHistorique: () => '/(tabs)/profile/historique' as const,
  profileRessources: () => '/(tabs)/profile/ressources' as const,
  profileRessourceDetail: (id: string) => `/(tabs)/profile/ressources/${id}` as const,
  profileNotifications: () => '/(tabs)/profile/notifications' as const,

  /** Auth */
  login: () => '/(auth)/login' as const,
  forgotPassword: () => '/(auth)/forgot-password' as const,
  phoneOtp: (phone: string) => `/(auth)/phone-otp?phone=${encodeURIComponent(phone)}` as const,
  resetPasswordOtp: (phone: string) =>
    `/(auth)/reset-password-otp?phone=${encodeURIComponent(phone)}` as const,
  setNewPassword: () => '/(auth)/set-new-password' as const,

  /** Other */
  calendar: (viewMode?: string) =>
    viewMode ? (`/(tabs)/calendar?viewMode=${viewMode}` as const) : ('/(tabs)/calendar' as const),
};

/**
 * Simple validation for dynamic route IDs.
 * Returns true if id looks valid (non-empty, reasonable length).
 */
export function isValidRouteId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0 && id.length <= 128;
}
