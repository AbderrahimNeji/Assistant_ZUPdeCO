/** Scope for PATCH when updating a session that belongs to a recurring series. */
export enum RecurrenceUpdateScope {
  /** Only the session identified by the URL (default). */
  OCCURRENCE = 'occurrence',
  /** This session and all later occurrences in the same recurrence group (same date/time ordering). */
  FOLLOWING = 'following',
}
