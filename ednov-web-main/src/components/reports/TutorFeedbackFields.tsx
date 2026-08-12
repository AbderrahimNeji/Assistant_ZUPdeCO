import * as React from 'react';
import { Star, Smile, FileText } from 'lucide-react';
import { Rating } from '@/components/forms/Rating';
import { Textarea } from '@/components/forms/Textarea';
import {
  SESSION_REPORT_FEELING_LABELS,
  SESSION_REPORT_FEELING_OPTIONS,
  type SessionReportFeeling,
} from '@/constants/session-report-feeling';
import type { SessionReportAuthorFeedback } from '@/types/report.types';

export interface TutorFeedbackValue {
  rating: number | null;
  comment: string;
  feeling: SessionReportFeeling | null;
}

interface TutorFeedbackFieldsProps {
  value: TutorFeedbackValue;
  onChange: (next: TutorFeedbackValue) => void;
  ratingState?: 'default' | 'error' | 'success';
  ratingError?: string;
  commentState?: 'default' | 'error' | 'success';
  commentError?: string;
  onBlurRating?: () => void;
  onBlurComment?: () => void;
}

export const TutorFeedbackFields: React.FC<TutorFeedbackFieldsProps> = ({
  value,
  onChange,
  ratingState,
  ratingError,
  commentState,
  commentError,
  onBlurRating,
  onBlurComment,
}) => {
  return (
    <div className="space-y-4">
      <Rating
        label="Note de la séance"
        value={value.rating}
        onChange={(rating) => onChange({ ...value, rating: rating ?? null })}
        onBlur={onBlurRating}
        state={ratingState}
        error={ratingError}
        helperText="Évaluez la qualité de la séance"
      />

      <div>
        <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Smile className="w-4 h-4" />
          Comment vous êtes-vous senti pendant cette séance ?
        </h5>
        <p className="text-sm text-muted-foreground mb-3">
          Optionnel — indiquez votre ressenti en tant que tuteur.
        </p>
        <div className="flex flex-col gap-2">
          {SESSION_REPORT_FEELING_OPTIONS.map(({ value: optValue, label }) => {
            const selected = value.feeling === optValue;
            return (
              <button
                key={optValue}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    feeling: selected ? null : optValue,
                  })
                }
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  selected
                    ? 'border-[var(--color-2-nuance-1)] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)] font-medium text-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Commentaire
        </h5>
        <Textarea
          label="Commentaires et observations"
          placeholder="Ex: Bonne participation, progrès notables"
          value={value.comment}
          maxLength={1000}
          showCharCount
          onChange={(e) => onChange({ ...value, comment: e.target.value })}
          onBlur={onBlurComment}
          state={commentState}
          error={commentError}
          rows={4}
          autoResize
          helperText="Décrivez les observations et le déroulement de la séance"
        />
      </div>
    </div>
  );
};

/** Affichage lecture seule d’un feedback tuteur. */
export const TutorFeedbackReadOnly: React.FC<{
  feedback: SessionReportAuthorFeedback;
}> = ({ feedback }) => {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Note de la séance</p>
        {feedback.rating !== null ? (
          <div className="flex items-center gap-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${i < feedback.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
              />
            ))}
            <span className="ml-2 text-sm text-foreground">{feedback.rating}/5</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune note attribuée</p>
        )}
      </div>

      {feedback.feeling != null && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Comment vous êtes-vous senti pendant cette séance
          </p>
          <p className="text-sm text-foreground">
            {SESSION_REPORT_FEELING_LABELS[feedback.feeling]}
          </p>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Commentaire</p>
        {feedback.comment?.trim() ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{feedback.comment}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun commentaire rédigé</p>
        )}
      </div>
    </div>
  );
};
