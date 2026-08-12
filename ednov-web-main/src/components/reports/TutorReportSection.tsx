import * as React from 'react';
import { GraduationCap } from 'lucide-react';
import { SectionCard } from '@/components/common/cards/SectionCard';
import {
  TutorFeedbackFields,
  TutorFeedbackReadOnly,
  type TutorFeedbackValue,
} from './TutorFeedbackFields';
import type { TutorReportSection as TutorReportSectionData } from '@/utils/report-author-feedback';

interface TutorReportSectionProps {
  section: TutorReportSectionData;
  mode: 'read' | 'edit';
  feedbackValue?: TutorFeedbackValue;
  onFeedbackChange?: (next: TutorFeedbackValue) => void;
  feedbackReadOnly?: boolean;
  ratingState?: 'default' | 'error' | 'success';
  ratingError?: string;
  commentState?: 'default' | 'error' | 'success';
  commentError?: string;
  onBlurRating?: () => void;
  onBlurComment?: () => void;
}

export const TutorReportSection: React.FC<TutorReportSectionProps> = ({
  section,
  mode,
  feedbackValue,
  onFeedbackChange,
  feedbackReadOnly = false,
  ratingState,
  ratingError,
  commentState,
  commentError,
  onBlurRating,
  onBlurComment,
}) => {
  const roleLabel = section.role === 'volunteer' ? 'VSC' : 'Tuteur';

  return (
    <SectionCard
      icon={GraduationCap}
      title={`${roleLabel} — ${section.displayName}`}
      colorName="color-2"
      colSpan="full"
    >
      {mode === 'read' || feedbackReadOnly ? (
        <TutorFeedbackReadOnly
          feedback={
            feedbackValue
              ? {
                  idAuteur: section.authorUserId,
                  rating: feedbackValue.rating,
                  comment: feedbackValue.comment || null,
                  feeling: feedbackValue.feeling,
                }
              : section.feedback
          }
        />
      ) : feedbackValue && onFeedbackChange ? (
        <TutorFeedbackFields
          value={feedbackValue}
          onChange={onFeedbackChange}
          ratingState={ratingState}
          ratingError={ratingError}
          commentState={commentState}
          commentError={commentError}
          onBlurRating={onBlurRating}
          onBlurComment={onBlurComment}
        />
      ) : null}
    </SectionCard>
  );
};
