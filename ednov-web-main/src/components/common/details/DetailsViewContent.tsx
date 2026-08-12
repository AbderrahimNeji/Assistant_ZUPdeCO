import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  renderAdminContent,
  renderStudentContent,
  renderTutorContent,
  renderVolunteerContent,
  renderEstablishmentContent,
  renderSessionContent,
  renderProgramContent,
  renderLevelContent,
  renderSubjectContent,
  renderActivityContent,
  renderActivityTypeContent,
  renderSchoolYearContent,
  renderHolidayContent,
  renderReportContent,
  renderVscReportContent,
  renderVscDailyReportContent,
  renderRoleContent,
} from './content-renderers';
import { renderMatchingPairContent } from '@/components/matching/renderMatchingPairContent';

type EntityType =
  | 'admin'
  | 'student'
  | 'tutor'
  | 'volunteer'
  | 'establishment'
  | 'session'
  | 'program'
  | 'level'
  | 'subject'
  | 'activity'
  | 'activityType'
  | 'schoolYear'
  | 'holiday'
  | 'report'
  | 'vscReport'
  | 'vscDailyReport'
  | 'pair'
  | 'role';

interface DetailsViewContentProps {
  data: any;
  type: EntityType;
  className?: string;
}

export const DetailsViewContent: React.FC<DetailsViewContentProps> = ({
  data,
  type,
  className,
}) => {
  if (!data) return null;

  const renderContent = () => {
    switch (type) {
      case 'admin':
        return renderAdminContent(data);
      case 'student':
        return renderStudentContent(data);
      case 'tutor':
        return renderTutorContent(data);
      case 'volunteer':
        return renderVolunteerContent(data);
      case 'establishment':
        return renderEstablishmentContent(data);
      case 'session':
        return renderSessionContent(data);
      case 'program':
        return renderProgramContent(data);
      case 'level':
        return renderLevelContent(data);
      case 'subject':
        return renderSubjectContent(data);
      case 'activity':
        return renderActivityContent(data);
      case 'activityType':
        return renderActivityTypeContent(data);
      case 'schoolYear':
        return renderSchoolYearContent(data);
      case 'holiday':
        return renderHolidayContent(data);
      case 'report':
        return renderReportContent(data);
      case 'vscReport':
        return renderVscReportContent(data);
      case 'vscDailyReport':
        return renderVscDailyReportContent(data);
      case 'pair':
        return renderMatchingPairContent(data);
      case 'role':
        return renderRoleContent(data);
      default:
        return <p className="text-sm text-muted-foreground">Type de contenu non supporté</p>;
    }
  };

  return <div className={cn('details-view-content', className)}>{renderContent()}</div>;
};
