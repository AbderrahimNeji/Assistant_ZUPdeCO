/**
 * Activity feed types aligned with backend GET /activity-feed/me.
 */

export type ActivityFeedItemType = 'session_completed' | 'cr_submitted' | 'badge_awarded';

export interface SessionCompletedPayload {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  establishmentName?: string | null;
}

export interface CrSubmittedPayload {
  reportId: string;
  sessionId: string;
  sessionDate?: string | null;
}

export interface BadgeAwardedPayload {
  badgeId: string;
  badgeNom: string;
  badgeIcone?: string | null;
  badgeCouleur?: string | null;
}

export type ActivityFeedPayload =
  | SessionCompletedPayload
  | CrSubmittedPayload
  | BadgeAwardedPayload;

export interface ActivityFeedItem {
  id: string;
  type: ActivityFeedItemType;
  date: string;
  payload: ActivityFeedPayload;
}
