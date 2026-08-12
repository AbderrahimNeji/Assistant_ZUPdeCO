import * as React from 'react';
import { Calendar, User, FileText, BarChart3, Clock } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CollapseReplaceForm } from '@/components/common/CollapseReplaceForm';
import { Select, type SelectOption } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { Input } from '@/components/forms/Input';
import { toast } from '@/lib/toast';
import { getVscReport, updateVscReport } from '@/services/vsc-reports.service';
import { getSessions } from '@/services/sessions.service';
import { useStudents, useVolunteers } from '@/hooks/useUsers';
import type {
  UpdateVscReportDto,
  VscReportStatus,
  VscReportCategory,
} from '@/types/vsc-report.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFormValidation } from '@/hooks/useFormValidation';
import { vscReportValidationSchema } from '@/utils/validation-schemas';

interface EditVscReportViewProps {
  sessionId: string;
  reportId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const statusOptions: SelectOption[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'submitted', label: 'Soumis' },
  { value: 'validated', label: 'Validé' },
];

const categoryOptions: SelectOption[] = [
  { value: 'daily', label: 'Journalier' },
  { value: 'weekly', label: 'Hebdomadaire' },
];

export const EditVscReportView: React.FC<EditVscReportViewProps> = ({
  sessionId,
  reportId,
  onClose,
  onSuccess,
}) => {
  // Type local pour gérer les dates en string dans les inputs
  type FormData = {
    vscId?: string;
    category?: VscReportCategory;
    periodStart?: string;
    periodEnd?: string;
    summary?: string;
    progressEvaluation?: string;
    recommendations?: string;
    status?: VscReportStatus;
    sessionsCompleted?: number;
    sessionsClosed?: number;
    sessionsCancelled?: number;
    assignmentsCreated?: number;
    reportsSubmitted?: number;
    reportsPending?: number;
    reportsValidated?: number;
    tutorHours?: number;
  };

  const [formData, setFormData] = React.useState<FormData>({});

  const validation = useFormValidation(vscReportValidationSchema);

  const { data: report, isLoading } = useQuery({
    queryKey: ['vsc-report', sessionId, reportId],
    queryFn: () => getVscReport(sessionId, reportId),
  });

  const { data: sessionsResponse } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => getSessions(),
  });

  type SessionType = {
    id: string;
    sessionDate: Date | string;
    establishment?: { name?: string };
  };

  const sessions = (sessionsResponse?.data || []) as SessionType[];

  const { data: studentsResponse } = useStudents();
  const { data: volunteersResponse } = useVolunteers();

  const students = studentsResponse?.data || [];
  const volunteers = volunteersResponse?.data || [];

  React.useEffect(() => {
    if (report) {
      const initialData: FormData = {
        vscId: report.vscId || undefined,
        category: report.category || undefined,
        periodStart: report.periodStart
          ? format(new Date(report.periodStart), 'yyyy-MM-dd')
          : undefined,
        periodEnd: report.periodEnd ? format(new Date(report.periodEnd), 'yyyy-MM-dd') : undefined,
        summary: report.summary || undefined,
        progressEvaluation: report.progressEvaluation || undefined,
        recommendations: report.recommendations || undefined,
        status: report.status,
        sessionsCompleted: report.sessionsCompleted || undefined,
        sessionsClosed: report.sessionsClosed || undefined,
        sessionsCancelled: report.sessionsCancelled || undefined,
        assignmentsCreated: report.assignmentsCreated || undefined,
        reportsSubmitted: report.reportsSubmitted || undefined,
        reportsPending: report.reportsPending || undefined,
        reportsValidated: report.reportsValidated || undefined,
        tutorHours: report.tutorHours || undefined,
      };
      setFormData(initialData);
      validation.validateInitialFormData(initialData);
    }
  }, [report]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateVscReportDto) => updateVscReport(sessionId, reportId, dto),
    onSuccess: () => {
      toast.success('Rapport VSC modifié avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification du rapport VSC');
    },
  });

  const handleFieldChange = (field: keyof FormData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const updatedData = { ...formData, [field]: value };
    validation.validateField(field, value, updatedData);
    validation.markAsTouched(field);
    validation.markAsDirty(field);
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleSubmit = () => {
    const isValid = validation.validateForm(formData);

    if (!isValid) {
      return;
    }

    const dto: UpdateVscReportDto = {
      vscId: formData.vscId || undefined,
      category: formData.category || undefined,
      periodStart: formData.periodStart ? new Date(formData.periodStart) : undefined,
      periodEnd: formData.periodEnd ? new Date(formData.periodEnd) : undefined,
      summary: formData.summary || undefined,
      progressEvaluation: formData.progressEvaluation || undefined,
      recommendations: formData.recommendations || undefined,
      status: formData.status,
      sessionsCompleted: formData.sessionsCompleted || undefined,
      sessionsClosed: formData.sessionsClosed || undefined,
      sessionsCancelled: formData.sessionsCancelled || undefined,
      assignmentsCreated: formData.assignmentsCreated || undefined,
      reportsSubmitted: formData.reportsSubmitted || undefined,
      reportsPending: formData.reportsPending || undefined,
      reportsValidated: formData.reportsValidated || undefined,
      tutorHours: formData.tutorHours || undefined,
    };
    updateMutation.mutate(dto);
  };

  const isAnyMutationPending = updateMutation.isPending;

  const selectedSession = sessions.find((s) => s.id === sessionId);
  const selectedStudent = students.find((s) => s.id === report?.studentId);
  const selectedVolunteer = volunteers.find((v) => v.id === report?.volunteerId);

  const volunteerOptions: SelectOption[] = volunteers.map((volunteer) => ({
    value: volunteer.id,
    label:
      volunteer.displayName ||
      [volunteer.firstName, volunteer.lastName].filter(Boolean).join(' ') ||
      volunteer.email ||
      'VSC inconnu',
  }));

  return (
    <CollapseReplaceForm
      formType="edit"
      title="Modifier le rapport VSC"
      subtitle="Modifiez les informations du rapport VSC"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={isAnyMutationPending}
      isValid={validation.isFormValid()}
      isLoading={isLoading}
    >
      {/* Section Type de rapport */}
      <div className="form-section">
        <h4 className="form-section-title">
          <BarChart3 className="w-4 h-4" />
          Type de rapport
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Catégorie"
            placeholder="Manuel ou automatique"
            options={categoryOptions}
            value={formData.category || ''}
            onChange={(value) => handleFieldChange('category', value)}
            onBlur={() => handleBlur('category')}
            state={validation.getFieldState('category')}
            error={validation.getFieldError('category')}
            helperText="Journalier/Hebdomadaire pour rapports automatiques, laisser vide pour rapport manuel"
          />
          <Select
            label="Statut du rapport"
            placeholder="Sélectionner un statut"
            options={statusOptions}
            value={formData.status || 'draft'}
            onChange={(value) => handleFieldChange('status', value as VscReportStatus)}
            onBlur={() => handleBlur('status')}
            state={validation.getFieldState('status')}
            error={validation.getFieldError('status')}
            helperText="Brouillon: modifiable. Soumis: en attente. Validé: approuvé."
          />
        </div>
      </div>

      {/* Section Période (pour rapports automatiques) */}
      {formData.category && (
        <div className="form-section">
          <h4 className="form-section-title">
            <Clock className="w-4 h-4" />
            Période
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Début de période"
              value={formData.periodStart || ''}
              onChange={(e) => handleFieldChange('periodStart', e.target.value)}
              onBlur={() => handleBlur('periodStart')}
              state={validation.getFieldState('periodStart')}
              error={validation.getFieldError('periodStart')}
            />
            <Input
              type="date"
              label="Fin de période"
              value={formData.periodEnd || ''}
              onChange={(e) => handleFieldChange('periodEnd', e.target.value)}
              onBlur={() => handleBlur('periodEnd')}
              state={validation.getFieldState('periodEnd')}
              error={validation.getFieldError('periodEnd')}
            />
          </div>
        </div>
      )}

      {/* Section VSC Responsable */}
      <div className="form-section">
        <h4 className="form-section-title">
          <User className="w-4 h-4" />
          VSC Responsable
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="VSC Responsable"
            placeholder="Sélectionner un VSC"
            options={volunteerOptions}
            value={formData.vscId || ''}
            onChange={(value) => handleFieldChange('vscId', value)}
            onBlur={() => handleBlur('vscId')}
            state={validation.getFieldState('vscId')}
            error={validation.getFieldError('vscId')}
            helperText="VSC responsable du rapport"
          />
        </div>
      </div>

      {/* Section Séance */}
      <div className="form-section">
        <h4 className="form-section-title">
          <Calendar className="w-4 h-4" />
          Séance
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedSession && (
            <div className="p-4 rounded-lg bg-muted/30 border border-[var(--color-1-nuance-3)]/30">
              <p className="font-medium text-foreground">
                {format(new Date(selectedSession.sessionDate), 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedSession.establishment?.name || 'Établissement inconnu'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section Participants (affichage seul pour rapports manuels) */}
      {!formData.category && (
        <div className="form-section">
          <h4 className="form-section-title">
            <User className="w-4 h-4" />
            Participants
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedStudent && (
              <div className="p-4 rounded-lg bg-muted/30 border border-[var(--color-1-nuance-3)]/30">
                <p className="text-xs text-muted-foreground mb-1">Élève</p>
                <p className="font-medium text-foreground">
                  {selectedStudent.displayName ||
                    [selectedStudent.firstName, selectedStudent.lastName]
                      .filter(Boolean)
                      .join(' ') ||
                    selectedStudent.email ||
                    'Élève inconnu'}
                </p>
                {selectedStudent.email && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedStudent.email}</p>
                )}
              </div>
            )}
            {selectedVolunteer && (
              <div className="p-4 rounded-lg bg-muted/30 border border-[var(--color-1-nuance-3)]/30">
                <p className="text-xs text-muted-foreground mb-1">Bénévole</p>
                <p className="font-medium text-foreground">
                  {selectedVolunteer.displayName ||
                    [selectedVolunteer.firstName, selectedVolunteer.lastName]
                      .filter(Boolean)
                      .join(' ') ||
                    selectedVolunteer.email ||
                    'Bénévole inconnu'}
                </p>
                {selectedVolunteer.email && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedVolunteer.email}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Métriques (pour rapports automatiques) */}
      {formData.category && (
        <div className="form-section">
          <h4 className="form-section-title">
            <BarChart3 className="w-4 h-4" />
            Métriques
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              type="number"
              label="Séances terminées"
              value={formData.sessionsCompleted || 0}
              onChange={(e) => handleFieldChange('sessionsCompleted', Number(e.target.value))}
              onBlur={() => handleBlur('sessionsCompleted')}
              state={validation.getFieldState('sessionsCompleted')}
              error={validation.getFieldError('sessionsCompleted')}
              min={0}
            />
            <Input
              type="number"
              label="Séances fermées"
              value={formData.sessionsClosed || 0}
              onChange={(e) => handleFieldChange('sessionsClosed', Number(e.target.value))}
              onBlur={() => handleBlur('sessionsClosed')}
              state={validation.getFieldState('sessionsClosed')}
              error={validation.getFieldError('sessionsClosed')}
              min={0}
            />
            <Input
              type="number"
              label="Séances annulées"
              value={formData.sessionsCancelled || 0}
              onChange={(e) => handleFieldChange('sessionsCancelled', Number(e.target.value))}
              onBlur={() => handleBlur('sessionsCancelled')}
              state={validation.getFieldState('sessionsCancelled')}
              error={validation.getFieldError('sessionsCancelled')}
              min={0}
            />
            <Input
              type="number"
              label="Affectations créées"
              value={formData.assignmentsCreated || 0}
              onChange={(e) => handleFieldChange('assignmentsCreated', Number(e.target.value))}
              onBlur={() => handleBlur('assignmentsCreated')}
              state={validation.getFieldState('assignmentsCreated')}
              error={validation.getFieldError('assignmentsCreated')}
              min={0}
            />
            <Input
              type="number"
              label="CR soumis"
              value={formData.reportsSubmitted || 0}
              onChange={(e) => handleFieldChange('reportsSubmitted', Number(e.target.value))}
              onBlur={() => handleBlur('reportsSubmitted')}
              state={validation.getFieldState('reportsSubmitted')}
              error={validation.getFieldError('reportsSubmitted')}
              min={0}
            />
            <Input
              type="number"
              label="CR en attente"
              value={formData.reportsPending || 0}
              onChange={(e) => handleFieldChange('reportsPending', Number(e.target.value))}
              onBlur={() => handleBlur('reportsPending')}
              state={validation.getFieldState('reportsPending')}
              error={validation.getFieldError('reportsPending')}
              min={0}
            />
            <Input
              type="number"
              label="CR validés"
              value={formData.reportsValidated || 0}
              onChange={(e) => handleFieldChange('reportsValidated', Number(e.target.value))}
              onBlur={() => handleBlur('reportsValidated')}
              state={validation.getFieldState('reportsValidated')}
              error={validation.getFieldError('reportsValidated')}
              min={0}
            />
            <Input
              type="number"
              label="Heures tuteur"
              value={formData.tutorHours || 0}
              onChange={(e) => handleFieldChange('tutorHours', Number(e.target.value))}
              onBlur={() => handleBlur('tutorHours')}
              state={validation.getFieldState('tutorHours')}
              error={validation.getFieldError('tutorHours')}
              min={0}
              step={0.5}
            />
          </div>
        </div>
      )}

      {/* Section Contenu du rapport (pour rapports manuels) */}
      {!formData.category && (
        <div className="form-section">
          <h4 className="form-section-title">
            <FileText className="w-4 h-4" />
            Contenu du rapport
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea
              label="Résumé de la séance"
              placeholder="Ex: Révisions en algèbre et géométrie"
              value={formData.summary || ''}
              maxLength={1000}
              showCharCount
              onChange={(e) => handleFieldChange('summary', e.target.value)}
              onBlur={() => handleBlur('summary')}
              state={validation.getFieldState('summary')}
              error={validation.getFieldError('summary')}
              rows={4}
              autoResize
              helperText="Résumez les activités et thèmes abordés"
            />
            <Textarea
              label="Progression de l'élève"
              placeholder="Ex: Progrès notables et autonomie accrue"
              value={formData.progressEvaluation || ''}
              maxLength={1000}
              showCharCount
              onChange={(e) => handleFieldChange('progressEvaluation', e.target.value)}
              onBlur={() => handleBlur('progressEvaluation')}
              state={validation.getFieldState('progressEvaluation')}
              error={validation.getFieldError('progressEvaluation')}
              rows={4}
              autoResize
              helperText="Décrivez l'évolution et les acquis de l'élève"
            />
            <Textarea
              label="Recommandations et axes d'amélioration"
              placeholder="Ex: Poursuivre les exercices d'application"
              value={formData.recommendations || ''}
              maxLength={1000}
              showCharCount
              onChange={(e) => handleFieldChange('recommendations', e.target.value)}
              onBlur={() => handleBlur('recommendations')}
              state={validation.getFieldState('recommendations')}
              error={validation.getFieldError('recommendations')}
              rows={4}
              autoResize
              helperText="Proposez des pistes d'amélioration et de suivi"
            />
          </div>
        </div>
      )}
    </CollapseReplaceForm>
  );
};
