import type { VscDailyReport } from '@/types/vsc-daily-report.types';
import type { VscReport, VscReportStatus } from '@/types/vsc-report.types';

function parseSessionDate(raw: string): Date {
  return new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
}

/** Map API `vsc_daily_reports` row to the table shape used by VscReportRow / VscReportCard. */
export function mapVscDailyReportToTableRow(d: VscDailyReport): VscReport {
  const sessionDateRaw = d.unlockSession?.sessionDate ?? d.reportDate;
  const sessionDate = parseSessionDate(
    typeof sessionDateRaw === 'string' ? sessionDateRaw : String(sessionDateRaw),
  );
  const created = d.createdAt ? new Date(d.createdAt) : new Date(d.generatedAt);
  const updated = d.updatedAt ? new Date(d.updatedAt) : created;
  const vsc = d.vscUser;
  const volunteer = vsc
    ? {
        id: vsc.id,
        firstName: vsc.firstName ?? null,
        lastName: vsc.lastName ?? null,
        displayName: vsc.displayName ?? null,
      }
    : undefined;

  const status: VscReportStatus =
    d.status === 'to_fill' ? 'to_fill' : d.status === 'submitted' ? 'submitted' : 'validated';

  return {
    id: d.id,
    companyId: d.companyId,
    sessionId: null,
    establishmentId: d.establishmentId,
    category: 'daily',
    periodStart: null,
    periodEnd: null,
    summary: d.comment,
    progressEvaluation: null,
    recommendations: null,
    status,
    createdAt: created,
    updatedAt: updated,
    studentName: null,
    volunteer,
    session: {
      id: d.unlockSession?.id ?? d.id,
      sessionDate,
      type: d.unlockSession?.type ?? '',
      establishment: d.establishment ? { name: d.establishment.name } : undefined,
    },
    isDailyReport: true,
    dailyPayload: d,
  };
}
