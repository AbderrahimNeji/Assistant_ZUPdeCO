import * as React from 'react';
import { Info } from 'lucide-react';
import {
  buildValidateWaitOptions,
  getVscWaitForAllTutorsBannerText,
} from '@/utils/report-author-feedback';
import { usePageActions } from '@/hooks/usePageActions';
import type { SessionReport } from '@/types/report.types';
import type { SessionWithParticipants } from '@/types/session.types';

interface ReportValidateWaitHintProps {
  report: SessionReport;
  session?: SessionWithParticipants | null;
  viewerUserId?: string;
  className?: string;
}

/** Bandeau informatif (fiche détail) : des tuteurs n’ont pas encore complété le CR. */
export const ReportValidateWaitHint: React.FC<ReportValidateWaitHintProps> = ({
  report,
  session,
  viewerUserId,
  className,
}) => {
  const { canValidate } = usePageActions('reports');
  if (!canValidate) return null;

  const validateOptions = buildValidateWaitOptions(report, session, viewerUserId);
  const bannerText = getVscWaitForAllTutorsBannerText(report, validateOptions);
  if (!bannerText) return null;

  return (
    <div
      className={
        className ??
        'flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)] px-3 py-2.5 text-sm text-foreground'
      }
    >
      <Info
        className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: 'rgb(var(--color-warning))' }}
        aria-hidden
      />
      <span>
        <span className="font-medium">Validation : </span>
        {bannerText}
      </span>
    </div>
  );
};
