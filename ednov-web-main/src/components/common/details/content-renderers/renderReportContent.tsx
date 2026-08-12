import * as React from 'react';
import type { SessionReport } from '@/types/report.types';
import { ReportDetailContent } from '@/components/reports/ReportDetailContent';

export interface RenderReportContentOptions {
  /** Chargement du CR (fetch API en cours). */
  isReportLoading?: boolean;
}

export const renderReportContent = (
  report: SessionReport | null | undefined,
  options?: RenderReportContentOptions,
): React.ReactNode => (
  <ReportDetailContent report={report} isReportLoading={options?.isReportLoading} />
);
