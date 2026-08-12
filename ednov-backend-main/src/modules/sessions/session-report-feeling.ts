/** Tutor self-assessment during the session (aligned with mobile `CompteRenduFeeling`). */
export const SESSION_REPORT_FEELING_VALUES = [
  'very_at_ease',
  'rather_at_ease',
  'neutral',
  'somewhat_difficult',
  'difficult',
] as const;

export type SessionReportFeeling = (typeof SESSION_REPORT_FEELING_VALUES)[number];
