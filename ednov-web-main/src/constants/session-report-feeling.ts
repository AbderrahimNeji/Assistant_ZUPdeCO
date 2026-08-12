/** Aligned with backend / mobile `CompteRenduFeeling`. */
export const SESSION_REPORT_FEELING_VALUES = [
  'very_at_ease',
  'rather_at_ease',
  'neutral',
  'somewhat_difficult',
  'difficult',
] as const;

export type SessionReportFeeling = (typeof SESSION_REPORT_FEELING_VALUES)[number];

export const SESSION_REPORT_FEELING_LABELS: Record<SessionReportFeeling, string> = {
  very_at_ease: "Très à l'aise",
  rather_at_ease: "Plutôt à l'aise",
  neutral: 'Neutre',
  somewhat_difficult: 'Un peu en difficulté',
  difficult: 'En difficulté',
};

export const SESSION_REPORT_FEELING_OPTIONS: { value: SessionReportFeeling; label: string }[] =
  SESSION_REPORT_FEELING_VALUES.map((value) => ({
    value,
    label: SESSION_REPORT_FEELING_LABELS[value],
  }));
