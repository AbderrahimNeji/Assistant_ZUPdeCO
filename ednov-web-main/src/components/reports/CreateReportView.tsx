import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CollapseReplaceForm } from '@/components/common/CollapseReplaceForm';
import { Textarea } from '@/components/forms/Textarea';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { Rating } from '@/components/forms/Rating';
import { Star, FileText, Smile } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createReport } from '@/services/reports.service';
import { getSession } from '@/services/sessions.service';
import { getSubjects } from '@/services/academic.service';
import { useAuthStore } from '@/stores/authStore';
import type { CreateReportDto } from '@/types/report.types';
import {
  SESSION_REPORT_FEELING_OPTIONS,
  type SessionReportFeeling,
} from '@/constants/session-report-feeling';
import { useFormValidation } from '@/hooks/useFormValidation';
import { reportValidationSchema } from '@/utils/validation-schemas';
import { serializeReportSubjectFromIds } from '@/utils/report-subject';

interface CreateReportViewProps {
  sessionId?: string;
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
}

type FormState = {
  rating: number | null;
  subjectIds: string[];
  comment: string;
  feeling: SessionReportFeeling | null;
};

export const CreateReportView: React.FC<CreateReportViewProps> = ({
  sessionId: initialSessionId,
  onClose,
  onSuccess,
  className,
}) => {
  const user = useAuthStore((state) => state.user);
  const validation = useFormValidation(reportValidationSchema);

  const [formData, setFormData] = React.useState<FormState>({
    rating: null,
    subjectIds: [],
    comment: '',
    feeling: null,
  });
  const subjectIdsTouchedByUser = React.useRef(false);

  const { data: session } = useQuery({
    queryKey: ['session', initialSessionId],
    queryFn: () => getSession(initialSessionId!),
    enabled: Boolean(initialSessionId),
  });

  const { data: allSubjects } = useQuery({
    queryKey: ['subjects', 'create-report'],
    queryFn: () => getSubjects({ page: 1, pageSize: 500 }),
    select: (response) => response.data,
  });

  const sessionSubjects = React.useMemo(() => {
    if (!session?.subjectIds?.length || !allSubjects) return [];
    return allSubjects.filter((s) => session.subjectIds.includes(s.id));
  }, [session, allSubjects]);

  const subjectOptions = React.useMemo(
    () => sessionSubjects.map((s) => ({ value: s.id, label: s.label })),
    [sessionSubjects],
  );

  React.useEffect(() => {
    if (subjectIdsTouchedByUser.current) return;
    if (!session?.subjectIds?.length) return;
    setFormData((prev) =>
      prev.subjectIds.length > 0 ? prev : { ...prev, subjectIds: [...session.subjectIds] },
    );
  }, [session?.subjectIds]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateReportDto) => createReport(initialSessionId!, dto),
    onSuccess: () => {
      toast.success('Compte rendu créé avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la création du compte rendu');
    },
  });

  const handleFieldChange = (
    field: Exclude<keyof FormState, 'subjectIds'>,
    value: string | number | null,
  ) => {
    setFormData((prev) => {
      const next: FormState = { ...prev, [field]: value } as FormState;
      const subjectWire = serializeReportSubjectFromIds(next.subjectIds);
      const payload = { ...next, subject: subjectWire };
      validation.validateField(field, value, payload as never);
      validation.markAsTouched(String(field));
      validation.markAsDirty(String(field));
      return next;
    });
  };

  const handleSubjectIdsChange = (values: string[]) => {
    subjectIdsTouchedByUser.current = true;
    setFormData((prev) => {
      const next = { ...prev, subjectIds: values };
      const subjectWire = serializeReportSubjectFromIds(values);
      const payload = { ...next, subject: subjectWire };
      validation.validateField('subject', subjectWire, payload as never);
      validation.markAsTouched('subject');
      validation.markAsDirty('subject');
      return next;
    });
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleSubmit = () => {
    const subjectWire = serializeReportSubjectFromIds(formData.subjectIds);
    const isValid = validation.validateForm({
      rating: formData.rating,
      subject: subjectWire,
      comment: formData.comment,
    });

    if (!isValid) {
      return;
    }

    if (!user?.id) {
      toast.error('Utilisateur non connecté');
      return;
    }

    const authorName =
      user.displayName ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.email ||
      'Auteur inconnu';

    const dto: CreateReportDto = {
      authorId: user.id,
      authorFeedbacks: [
        {
          idAuteur: user.id,
          rating: formData.rating,
          comment: formData.comment || null,
          feeling: formData.feeling,
        },
      ],
      subjectIds: formData.subjectIds.length > 0 ? formData.subjectIds : undefined,
      authorName,
    };
    createMutation.mutate(dto);
  };

  const isSubmitting = createMutation.isPending;
  const isFormValid = validation.isFormValid();

  return (
    <CollapseReplaceForm
      formType="create"
      title="Créer un compte rendu"
      subtitle="Renseignez les informations du compte rendu"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Créer"
      isSubmitting={isSubmitting}
      isValid={isFormValid}
      className={className}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <Star className="w-4 h-4" />
          Évaluation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Rating
            label="Note de la séance"
            value={formData.rating}
            onChange={(value) => handleFieldChange('rating', value ?? null)}
            onBlur={() => handleBlur('rating')}
            state={validation.getFieldState('rating')}
            error={validation.getFieldError('rating')}
            helperText="Évaluez la qualité de la séance"
          />
          <MultiSelect
            label="Matières"
            placeholder="Sélectionner une ou plusieurs matières"
            options={subjectOptions}
            value={formData.subjectIds}
            onChange={handleSubjectIdsChange}
            onBlur={() => handleBlur('subject')}
            state={validation.getFieldState('subject')}
            error={validation.getFieldError('subject')}
            helperText="Matières abordées durant la séance"
            maxVisibleTags={3}
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Smile className="w-4 h-4" />
          Comment vous êtes-vous senti pendant cette séance ?
        </h4>
        <p className="text-sm text-muted-foreground mb-3">
          Optionnel — indiquez votre ressenti en tant que tuteur.
        </p>
        <div className="flex flex-col gap-2">
          {SESSION_REPORT_FEELING_OPTIONS.map(({ value, label }) => {
            const selected = formData.feeling === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    feeling: selected ? null : value,
                  }))
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

      <div className="form-section">
        <h4 className="form-section-title">
          <FileText className="w-4 h-4" />
          Commentaire
        </h4>
        <Textarea
          label="Commentaires et observations"
          placeholder="Ex: Bonne participation, progrès notables"
          value={formData.comment}
          maxLength={1000}
          showCharCount
          onChange={(e) => handleFieldChange('comment', e.target.value)}
          onBlur={() => handleBlur('comment')}
          state={validation.getFieldState('comment')}
          error={validation.getFieldError('comment')}
          rows={4}
          autoResize
          helperText="Décrivez les observations et le déroulement de la séance"
        />
      </div>
    </CollapseReplaceForm>
  );
};
