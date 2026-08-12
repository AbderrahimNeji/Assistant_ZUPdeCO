import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CollapseReplaceForm } from '@/components/common/CollapseReplaceForm';
import { VscDailyReportDetailsPanel } from '@/components/common/details/content-renderers/renderVscDailyReportContent';
import { getVscDailyReport } from '@/services/vsc-daily-reports.service';

interface EditVscDailyReportViewProps {
  reportId: string;
  onClose: () => void;
}

export const EditVscDailyReportView: React.FC<EditVscDailyReportViewProps> = ({
  reportId,
  onClose,
}) => {
  const {
    data: report,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['vsc-daily-report', reportId],
    queryFn: () => getVscDailyReport(reportId),
  });

  const subtitle = report
    ? `${report.establishment?.name ?? 'Établissement'} · ${typeof report.reportDate === 'string' ? report.reportDate : String(report.reportDate)}`
    : undefined;

  return (
    <CollapseReplaceForm
      formType="edit"
      title="Modifier le rapport VSC journalier"
      subtitle={subtitle}
      onClose={onClose}
      onSubmit={() => {}}
      submitLabel="Enregistrer"
      isSubmitting={false}
      isValid
      isLoading={isLoading}
      showFooter={false}
    >
      {isError ? (
        <p className="text-sm text-destructive">
          Impossible de charger ce rapport. Vérifiez votre connexion ou vos droits d’accès.
        </p>
      ) : report ? (
        <VscDailyReportDetailsPanel report={report} presentationMode="edit" hideDetailHeader />
      ) : null}
    </CollapseReplaceForm>
  );
};
