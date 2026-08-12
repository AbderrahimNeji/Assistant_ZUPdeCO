/**
 * Static / seeded data aligned with backend models and relations.
 * Use when EXPO_PUBLIC_USE_STATIC_DATA=true so the app behaves like with real API responses.
 *
 * Backend alignment:
 * - Session: id (uuid), sessionDate + startTime → date, establishmentId/roomId → establishment/room names, status (planned|in_progress|completed|closed|cancelled)
 * - SessionReport: id (uuid), sessionId (fk), authorId (user uuid), rating 1-5, subject, comment, status (draft|submitted|validated|overdue) → mobile draft|submitted
 * - User: id (uuid), firstName, lastName (students = users with student role)
 * - Report KPIs: missingReports, overdueReports, submittedPendingValidation, validatedReports
 */

import type { CompteRendu } from '@/types/compteRendu';
import type {
  Session,
  SessionParticipant,
  AttendanceHistoryEntry,
  AttendanceHistoryResponse,
  AttendanceHistoryQuery,
} from '@/types/session';
import type { Student } from '@/types/student';
import type { TutorProfile } from '@/types/profile';
import type { ReportKpis } from '@/services/sessions';
import type { GamificationSummary, GamificationXpLogEntry, LeaderboardResponse } from '@/types/gamification';
import type { ActivityFeedItem } from '@/types/activityFeed';
import type { PedagogicalResource, ResourcesListResponse } from '@/types/resources';

// ─── Canonical UUIDs (match backend entity ids) ─────────────────────────────
export const STATIC_IDS = {
  company: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  establishment1: 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
  establishment2: 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  room1: 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
  room2: 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b',
  room3: 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c',
  room4: 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d',
  room5: 'b8c9d0e1-f2a3-1b2c-5d6e-7f8a9b0c1d2e',
  /** Tutor (volunteer) user — used as profile id and report authorId */
  userTutor: 'c9d0e1f2-a3b4-2c3d-6e7f-8a9b0c1d2e3f',
  /** Student users (backend: users with student role; no separate Student table) */
  userStudent1: 'd0e1f2a3-b4c5-3d4e-7f8a-9b0c1d2e3f4a',
  userStudent2: 'e1f2a3b4-c5d6-4e5f-8a9b-0c1d2e3f4a5b',
  userStudent3: 'f2a3b4c5-d6e7-5f6a-9b0c-1d2e3f4a5b6c',
  userStudent4: 'a3b4c5d6-e7f8-6a7b-0c1d-2e3f4a5b6c7d',
  userStudent5: 'b4c5d6e7-f8a9-7b8c-1d2e-3f4a5b6c7d8e',
  userStudent6: 'c5d6e7f8-a9b0-8c9d-2e3f-4a5b6c7d8e9f',
  userStudent7: 'd6e7f8a9-b0c1-9d0e-3f4a-5b6c7d8e9f0a',
  userStudent8: 'e7f8a9b0-c1d2-0e1f-4a5b-6c7d8e9f0a1b',
  /** Sessions (backend sessions.id) */
  session1: 'f8a9b0c1-d2e3-1f2a-5b6c-7d8e9f0a1b2c',
  session2: 'a9b0c1d2-e3f4-2a3b-6c7d-8e9f0a1b2c3d',
  session3: 'b0c1d2e3-f4a5-3b4c-7d8e-9f0a1b2c3d4e',
  session4: 'c1d2e3f4-a5b6-4c5d-8e9f-0a1b2c3d4e5f',
  session5: 'd2e3f4a5-b6c7-5d6e-9f0a-1b2c3d4e5f6a',
  session6: 'e3f4a5b6-c7d8-6e7f-0a1b-2c3d4e5f6a7b',
  /** Session reports (backend session_reports.id, one per session) */
  report1: 'f4a5b6c7-d8e9-7f8a-1b2c-3d4e5f6a7b8c',
  report2: 'a5b6c7d8-e9f0-8a9b-2c3d-4e5f6a7b8c9d',
  report3: 'b6c7d8e9-f0a1-9b0c-3d4e-5f6a7b8c9d0e',
  report4: 'c7d8e9f0-a1b2-0c1d-4e5f-6a7b8c9d0e1f',
  report5: 'd8e9f0a1-b2c3-1d2e-5f6a-7b8c9d0e1f2a',
  report6: 'e9f0a1b2-c3d4-2e3f-6a7b-8c9d0e1f2a3b',
  /** Session participants (backend session_participants.id) */
  participant1: 'a1b2c3d4-1111-4a5b-8c9d-0e1f2a3b4c5d',
  participant2: 'b2c3d4e5-2222-5b6c-9d0e-1f2a3b4c5d6e',
  participant3: 'c3d4e5f6-3333-6c7d-0e1f-2a3b4c5d6e7f',
  participant4: 'd4e5f6a7-4444-7d8e-1f2a-3b4c5d6e7f8a',
  participant5: 'e5f6a7b8-5555-8e9f-2a3b-4c5d6e7f8a9b',
} as const;

/** Référentiel matières (aligné backend `subjects.id`). */
export const STATIC_SUBJECT_IDS = {
  math: '11111111-1111-4111-8111-111111110001',
  francais: '11111111-1111-4111-8111-111111110002',
  svt: '11111111-1111-4111-8111-111111110003',
} as const;

export function getStaticSubjectCatalog(): { id: string; label: string }[] {
  return [
    { id: STATIC_SUBJECT_IDS.math, label: 'Mathématiques' },
    { id: STATIC_SUBJECT_IDS.francais, label: 'Français' },
    { id: STATIC_SUBJECT_IDS.svt, label: 'SVT' },
  ];
}

// ─── Helpers: date as backend sessionDate + startTime ───────────────────────
function dateTime(sessionDate: string, startTime: string): string {
  return `${sessionDate}T${startTime}`;
}

// ─── Sessions (backend Session entity) ──────────────────────────────────────
/** Sessions aligned with backend: id uuid, date = sessionDate + startTime, status from backend enum. */
export function getStaticSessions(): Session[] {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const past1 = new Date(now);
  past1.setDate(past1.getDate() - 7);
  const past2 = new Date(now);
  past2.setDate(past2.getDate() - 2);
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 5);
  const later = new Date(now);
  later.setDate(later.getDate() + 14);

  return [
    {
      id: STATIC_IDS.session1,
      date: dateTime(toDate(past1), '10:00:00'),
      endTime: '11:00:00',
      room: 'Salle 101',
      establishment: 'Lycée Jean-Moulin',
      status: 'completed',
      format: 'presentiel',
      reportId: STATIC_IDS.report1,
      subjectIds: [STATIC_SUBJECT_IDS.math],
    },
    {
      id: STATIC_IDS.session2,
      date: dateTime(toDate(past2), '14:00:00'),
      endTime: '15:00:00',
      room: 'Salle 203',
      establishment: 'Collège Victor-Hugo',
      status: 'completed',
      format: 'presentiel',
      subjectIds: [STATIC_SUBJECT_IDS.francais],
    },
    {
      id: STATIC_IDS.session3,
      date: dateTime(toDate(today), '10:00:00'),
      endTime: '11:00:00',
      room: 'Salle 102',
      establishment: 'Lycée Jean-Moulin',
      status: 'in_progress',
      format: 'visio',
      joinLink: 'https://meet.example.com/ednov-session',
      subjectIds: [STATIC_SUBJECT_IDS.francais, STATIC_SUBJECT_IDS.math],
    },
    {
      id: STATIC_IDS.session4,
      date: dateTime(toDate(tomorrow), '09:00:00'),
      endTime: '10:00:00',
      room: 'Salle 301',
      establishment: 'Lycée Jean-Moulin',
      status: 'planned',
      format: 'presentiel',
      subjectIds: [STATIC_SUBJECT_IDS.math],
    },
    {
      id: STATIC_IDS.session5,
      date: dateTime(toDate(nextWeek), '11:00:00'),
      endTime: '12:00:00',
      room: null,
      establishment: 'Collège Victor-Hugo',
      status: 'planned',
      format: 'presentiel',
      subjectIds: [STATIC_SUBJECT_IDS.svt],
    },
    {
      id: STATIC_IDS.session6,
      date: dateTime(toDate(later), '15:00:00'),
      endTime: '16:00:00',
      room: 'Salle 201',
      establishment: 'Lycée Jean-Moulin',
      status: 'planned',
      format: 'presentiel',
      subjectIds: [STATIC_SUBJECT_IDS.math, STATIC_SUBJECT_IDS.svt],
    },
  ];
}

// ─── Session reports / Comptes rendus (backend SessionReport) ──────────────
/** Backend: one report per session; rating 1-5, subject, comment, status draft|submitted|validated|overdue. */
export function getStaticComptesRendus(): CompteRendu[] {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00.000Z`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    {
      id: STATIC_IDS.report1,
      sessionId: STATIC_IDS.session1,
      note: '14',
      matiere: 'Mathématiques',
      matiereIds: [STATIC_SUBJECT_IDS.math],
      commentaire: 'Bon travail sur les équations.',
      submittedAt: toISO(yesterday),
      status: 'submitted',
    },
    {
      id: STATIC_IDS.report2,
      sessionId: STATIC_IDS.session2,
      note: null,
      matiere: null,
      matiereIds: [],
      commentaire: null,
      submittedAt: null,
      status: 'draft',
    },
    {
      id: STATIC_IDS.report3,
      sessionId: STATIC_IDS.session3,
      note: '12',
      matiere: 'Français',
      matiereIds: [STATIC_SUBJECT_IDS.francais],
      commentaire: null,
      submittedAt: toISO(now),
      status: 'submitted',
    },
    {
      id: STATIC_IDS.report4,
      sessionId: STATIC_IDS.session4,
      note: null,
      matiere: null,
      matiereIds: [],
      commentaire: null,
      submittedAt: null,
      status: 'draft',
    },
    {
      id: STATIC_IDS.report5,
      sessionId: STATIC_IDS.session5,
      note: '16',
      matiere: 'SVT',
      matiereIds: [STATIC_SUBJECT_IDS.svt],
      commentaire: 'Très participatif.',
      submittedAt: toISO(yesterday),
      status: 'submitted',
    },
    {
      id: STATIC_IDS.report6,
      sessionId: STATIC_IDS.session6,
      note: null,
      matiere: null,
      matiereIds: [],
      commentaire: null,
      submittedAt: null,
      status: 'draft',
    },
  ];
}

// ─── Report KPIs (backend GET /sessions/report-kpis) ─────────────────────────
/** Derived from static session reports so counts stay consistent. */
export function getStaticReportKpis(): ReportKpis {
  const crs = getStaticComptesRendus();
  const validated = crs.filter((c) => c.status === 'submitted').length;
  const pendingReports = crs.filter(
    (c) => c.status === 'draft' || c.status === 'to_complete' || c.status === 'overdue',
  ).length;
  const overdueReports = crs.filter((c) => c.status === 'overdue').length;
  return {
    missingReports: 0,
    overdueReports,
    pendingReports,
    submittedPendingValidation: 0,
    validatedReports: validated,
  };
}

// ─── Students (backend: User with student role; no separate Student table) ───
/** Static list: UI uses displayName + levelLabel; first/last kept for session participant fixtures. */
export function getStaticStudents(): Student[] {
  return [
    { id: STATIC_IDS.userStudent1, displayName: 'Démo A', levelLabel: '6e', firstName: 'Lucas', lastName: 'Martin' },
    { id: STATIC_IDS.userStudent2, displayName: 'Démo B', levelLabel: '5e', firstName: 'Emma', lastName: 'Bernard' },
    { id: STATIC_IDS.userStudent3, displayName: 'Démo C', levelLabel: '4e', firstName: 'Hugo', lastName: 'Dubois' },
    { id: STATIC_IDS.userStudent4, displayName: 'Démo D', levelLabel: '3e', firstName: 'Léa', lastName: 'Thomas' },
    { id: STATIC_IDS.userStudent5, displayName: 'Démo E', levelLabel: '2nde', firstName: 'Raphaël', lastName: 'Robert' },
    { id: STATIC_IDS.userStudent6, displayName: 'Démo F', levelLabel: '1re', firstName: 'Chloé', lastName: 'Richard' },
    { id: STATIC_IDS.userStudent7, displayName: 'Démo G', levelLabel: 'Terminale', firstName: 'Louis', lastName: 'Petit' },
    { id: STATIC_IDS.userStudent8, displayName: 'Démo H', levelLabel: '6e', firstName: 'Manon', lastName: 'Durand' },
  ];
}

// ─── Attendance history (backend GET /sessions/attendance-history) ───────────
/** Past sessions with participants for static mode. */
export function getStaticAttendanceHistory(
  query?: AttendanceHistoryQuery,
): AttendanceHistoryResponse {
  const sessions = getStaticSessions();
  const today = new Date().toISOString().slice(0, 10);
  const pastSessions = sessions
    .filter((s) => {
      const sessionDate = s.date.slice(0, 10);
      return sessionDate < today || s.status === 'completed' || s.status === 'closed';
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  let items: AttendanceHistoryEntry[] = pastSessions.map((session) => ({
    session,
    participants: getStaticSessionParticipants(session.id),
  }));
  if (query?.dateFrom) {
    items = items.filter((e) => e.session.date.slice(0, 10) >= (query.dateFrom ?? ''));
  }
  if (query?.dateTo) {
    items = items.filter((e) => e.session.date.slice(0, 10) <= (query.dateTo ?? ''));
  }
  const total = items.length;
  const page = Math.max(1, query?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query?.pageSize ?? 20));
  const start = (page - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);
  return { items: pagedItems, total, page, pageSize };
}

// ─── Session participants (backend session_participants + user) ───────────────
/** Participants with attendance for static sessions. Used when useStaticData. */
export function getStaticSessionParticipants(sessionId: string): SessionParticipant[] {
  const students = getStaticStudents();
  const bySession: Record<string, SessionParticipant[]> = {
    [STATIC_IDS.session1]: [
      { id: STATIC_IDS.participant1, sessionId: STATIC_IDS.session1, userId: students[0].id, role: 'student', attendanceStatus: 'present', displayName: students[0].displayName ?? undefined, firstName: students[0].firstName, lastName: students[0].lastName },
      { id: STATIC_IDS.participant2, sessionId: STATIC_IDS.session1, userId: students[1].id, role: 'student', attendanceStatus: 'absent', displayName: students[1].displayName ?? undefined, firstName: students[1].firstName, lastName: students[1].lastName },
    ],
    [STATIC_IDS.session3]: [
      { id: STATIC_IDS.participant3, sessionId: STATIC_IDS.session3, userId: students[2].id, role: 'student', attendanceStatus: 'pending', displayName: students[2].displayName ?? undefined, firstName: students[2].firstName, lastName: students[2].lastName },
    ],
    [STATIC_IDS.session4]: [
      { id: STATIC_IDS.participant4, sessionId: STATIC_IDS.session4, userId: students[3].id, role: 'student', attendanceStatus: 'pending', displayName: students[3].displayName ?? undefined, firstName: students[3].firstName, lastName: students[3].lastName },
      { id: STATIC_IDS.participant5, sessionId: STATIC_IDS.session4, userId: students[4].id, role: 'student', attendanceStatus: 'excused', displayName: students[4].displayName ?? undefined, firstName: students[4].firstName, lastName: students[4].lastName },
    ],
  };
  return bySession[sessionId] ?? [];
}

// ─── Tutor profile (backend GET /users/login → User) ──────────────────────────
/** Profile for the logged-in tutor; id = backend user uuid (used as authorId in reports). */
export function getStaticProfile(): TutorProfile {
  return {
    id: STATIC_IDS.userTutor,
    firstName: 'Marie',
    lastName: 'Dupont',
    createdAt: '2024-09-01',
    phone: '+33 6 12 34 56 78',
    establishment: 'Lycée Jean-Moulin',
    engagement: [
      { day: 'Lundi', start: '09:00', end: '12:00' },
      { day: 'Mercredi', start: '14:00', end: '17:00' },
    ],
    criminalRecord: {
      fileName: 'casier-judiciaire-demo.pdf',
      depositedAt: `${new Date().toISOString().slice(0, 10)}T10:00:00.000Z`,
      status: 'pending',
      validatedAt: null,
    },
    tutorPlatformStatus: 'pending',
  };
}

// ─── Tutor dashboard (backend GET /sessions/dashboard/tutor) ─────────────────
import type { TutorDashboard } from '@/services/sessions';

export function getStaticTutorDashboard(): TutorDashboard {
  const sessions = getStaticSessions();
  const reports = getStaticComptesRendus();
  const upcomingSessions = sessions
    .filter((s) => s.status === 'planned' || s.status === 'in_progress')
    .slice(0, 5);
  const reportsToSubmit = reports.filter((r) => r.status === 'draft');
  return {
    upcomingSessions,
    reportsToSubmit: reportsToSubmit as unknown[],
  };
}

// ─── Gamification (backend GET /gamification/me) ───────────────────────────
export function getStaticGamification(): GamificationSummary {
  const niveau2 = { id: 'n2', numero: 2, nom: 'Intermédiaire', xpRequis: 100, icone: 'star', couleur: '#C0C0C0' };
  const niveau3 = { id: 'n3', numero: 3, nom: 'Expert', xpRequis: 200, icone: 'trophy', couleur: '#FFD700' };
  return {
    totalXp: 120,
    currentNiveau: niveau2,
    nextNiveau: niveau3,
    xpInCurrentLevel: 20,
    xpToNextLevel: 80,
    xpRangeToNext: 100,
    levelBadge: {
      code: 'LEVEL_TIER_SILVER',
      tier: 'silver',
      displayLabel: 'Argent',
      theme: 'silver',
      niveauNumero: 2,
    },
    attendanceScore: 0.9,
    pedagogicalQualityScore: 0.85,
    badges: [
      { badge: { id: 'b1', nom: 'Première séance', description: 'Première séance réalisée', icone: 'calendar-check', couleur: '#4CAF50' }, awardedAt: '2024-10-01T10:00:00Z' },
      { badge: { id: 'b2', nom: 'Régularité', description: '5 séances consécutives', icone: 'fire', couleur: '#FF9800' }, awardedAt: '2024-10-15T14:00:00Z' },
    ],
  };
}

export function getStaticGamificationHistory(_limit?: number): GamificationXpLogEntry[] {
  return [
    { id: 'log1', xpAmount: 10, source: 'session_completed', createdAt: '2024-10-20T12:00:00Z' },
    { id: 'log2', xpAmount: 15, source: 'report_submitted', createdAt: '2024-10-18T09:00:00Z' },
  ];
}

// ─── Leaderboard (backend GET /gamification/leaderboard) ───────────────────
export function getStaticLeaderboard(_limit?: number): LeaderboardResponse {
  const niveau2 = { id: 'n2', numero: 2, nom: 'Intermédiaire', xpRequis: 100, icone: 'star', couleur: '#C0C0C0' };
  const niveau3 = { id: 'n3', numero: 3, nom: 'Expert', xpRequis: 200, icone: 'trophy', couleur: '#FFD700' };
  const niveau1 = { id: 'n1', numero: 1, nom: 'Débutant', xpRequis: 0, icone: null, couleur: null };
  return {
    entries: [
      {
        rank: 1,
        displayName: 'Marie Dupont',
        totalXp: 450,
        currentNiveau: niveau3,
        levelBadge: {
          code: 'LEVEL_TIER_GOLD',
          tier: 'gold',
          displayLabel: 'Gold',
          theme: 'gold',
          niveauNumero: 3,
        },
      },
      {
        rank: 2,
        displayName: 'Vous',
        totalXp: 120,
        currentNiveau: niveau2,
        levelBadge: {
          code: 'LEVEL_TIER_SILVER',
          tier: 'silver',
          displayLabel: 'Argent',
          theme: 'silver',
          niveauNumero: 2,
        },
      },
      {
        rank: 3,
        displayName: 'Jean Martin',
        totalXp: 80,
        currentNiveau: niveau1,
        levelBadge: {
          code: 'LEVEL_TIER_BRONZE',
          tier: 'bronze',
          displayLabel: 'Bronze',
          theme: 'bronze',
          niveauNumero: 1,
        },
      },
    ],
    myRank: 2,
    myEntry: {
      rank: 2,
      displayName: 'Vous',
      totalXp: 120,
      currentNiveau: niveau2,
      levelBadge: {
        code: 'LEVEL_TIER_SILVER',
        tier: 'silver',
        displayLabel: 'Argent',
        theme: 'silver',
        niveauNumero: 2,
      },
    },
  };
}

// ─── Activity feed (backend GET /activity-feed/me) ─────────────────────────
export function getStaticActivityFeed(_limit?: number): ActivityFeedItem[] {
  return [
    {
      id: 'session-s1',
      type: 'session_completed',
      date: '2024-10-22T14:00:00.000Z',
      payload: {
        sessionId: STATIC_IDS.session1,
        sessionDate: '2024-10-22',
        startTime: '14:00',
        establishmentName: 'Collège Example',
      },
    },
    {
      id: 'cr-r1',
      type: 'cr_submitted',
      date: '2024-10-21T16:30:00.000Z',
      payload: {
        reportId: STATIC_IDS.report1,
        sessionId: STATIC_IDS.session1,
        sessionDate: '2024-10-20',
      },
    },
    {
      id: 'badge-b1',
      type: 'badge_awarded',
      date: '2024-10-20T10:00:00.000Z',
      payload: {
        badgeId: 'b1',
        badgeNom: 'Première séance',
        badgeIcone: 'calendar-check',
        badgeCouleur: '#4CAF50',
      },
    },
  ];
}

// ─── Pedagogical resources (backend GET /resources) ───────────────────────
const STATIC_RESOURCES: PedagogicalResource[] = [
  { id: 'res1', title: 'Guide du tuteur', description: 'Documentation pour bien démarrer en tant que tuteur.', url: 'https://example.com/guide-tuteur', sortOrder: 0, subjectId: 'francais', levelId: 'college' },
  { id: 'res2', title: 'Fiches méthodologie', description: 'Méthodes de travail et bonnes pratiques.', content: 'Contenu des fiches…', sortOrder: 1, subjectId: 'mathematiques', levelId: 'college' },
  { id: 'res3', title: 'Ressources par matière', description: 'Liens utiles par discipline.', url: 'https://example.com/ressources', sortOrder: 2, subjectId: 'francais', levelId: 'lycee' },
];

export function getStaticResourcesList(query?: { page?: number; pageSize?: number; subjectId?: string; levelId?: string }): ResourcesListResponse {
  let list = [...STATIC_RESOURCES];
  if (query?.subjectId) list = list.filter((r) => r.subjectId === query.subjectId);
  if (query?.levelId) list = list.filter((r) => r.levelId === query.levelId);
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  const paged = list.slice(start, start + pageSize);
  return { data: paged, total: list.length, page, pageSize };
}

export function getStaticResourceById(id: string): PedagogicalResource | null {
  return STATIC_RESOURCES.find((r) => r.id === id) ?? null;
}
