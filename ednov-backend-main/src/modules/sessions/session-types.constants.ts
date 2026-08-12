/** All allowed values for `sessions.type` (must match DB CHECK constraint). */
export const SESSION_TYPES = [
  'homework_help',
  'individual_tutoring',
  'workshop',
  'whole_class',
  'group_tutoring',
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

/** Collective group mode: 1 session per tutor, 1 tutor per student. */
export const GROUP_SESSION_TYPES: readonly SessionType[] = [
  'homework_help',
  'workshop',
  'group_tutoring',
];

export function isGroupSessionType(sessionType: SessionType): boolean {
  return (GROUP_SESSION_TYPES as readonly string[]).includes(sessionType);
}
