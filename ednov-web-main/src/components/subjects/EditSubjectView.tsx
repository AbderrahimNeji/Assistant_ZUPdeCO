import * as React from 'react';
import { FileText } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { Select, type SelectOption } from '@/components/forms/Select';
import { Checkbox } from '@/components/forms/Checkbox';
import { toast } from '@/lib/toast';
import { getSubject, updateSubject } from '@/services/academic.service';
import type { UpdateSubjectDto } from '@/types/subject.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { subjectValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

interface EditSubjectViewProps {
  subjectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const CYCLE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Aucun' },
  { value: 'primary', label: 'Primaire' },
  { value: 'middle', label: 'Collège' },
  { value: 'high', label: 'Lycée' },
];

export const EditSubjectView: React.FC<EditSubjectViewProps> = ({
  subjectId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = React.useState<UpdateSubjectDto>({});

  const validation = useFormValidation(subjectValidationSchema);

  const { data: subject, isLoading } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubject(subjectId),
  });

  React.useEffect(() => {
    if (subject) {
      const initialData = {
        code: subject.code,
        label: subject.label,
        description: subject.description || '',
        educationCycle: subject.educationCycle || undefined,
        isCore: subject.isCore,
        status: subject.status,
      };
      setFormData(initialData);
      validation.validateInitialFormData(initialData);
    }
  }, [subject]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateSubjectDto) => updateSubject(subjectId, dto),
    onSuccess: () => {
      toast.success('Matière modifiée avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification de la matière');
    },
  });

  const handleFieldChange = (
    field: keyof UpdateSubjectDto,
    value: string | number | boolean | undefined,
  ) => {
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

    updateMutation.mutate(formData);
  };

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier la matière"
      subtitle="Modifiez les informations de la matière"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={updateMutation.isPending}
      isValid={validation.isFormValid()}
      isLoading={isLoading}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <FileText className="w-4 h-4" />
          Informations générales
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Code"
            value={formData.code || ''}
            onChange={(e) => handleFieldChange('code', e.target.value)}
            onBlur={() => handleBlur('code')}
            placeholder="Ex: MATH"
            maxLength={50}
            required
            helperText="Code unique identifiant la matière"
            state={validation.getFieldState('code')}
            error={validation.getFieldError('code')}
          />

          <Input
            label="Libellé"
            value={formData.label || ''}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            onBlur={() => handleBlur('label')}
            placeholder="Ex: Mathématiques"
            maxLength={255}
            required
            helperText="Nom complet de la matière"
            state={validation.getFieldState('label')}
            error={validation.getFieldError('label')}
          />
        </div>

        <Input
          label="Description"
          value={formData.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Ex: Enseignement des mathématiques"
          maxLength={500}
          state={validation.getFieldState('description')}
          error={validation.getFieldError('description')}
        />

        <Select
          label="Cycle éducatif"
          options={CYCLE_OPTIONS}
          value={formData.educationCycle || ''}
          placeholder="Sélectionner un cycle (optionnel)"
          onChange={(value) =>
            handleFieldChange(
              'educationCycle',
              value ? (value as 'primary' | 'middle' | 'high') : undefined,
            )
          }
          onBlur={() => handleBlur('educationCycle')}
          state={validation.getFieldState('educationCycle')}
          error={validation.getFieldError('educationCycle')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="pt-4">
            <Checkbox
              label="Matière principale"
              checked={formData.isCore || false}
              onCheckedChange={(checked) => handleFieldChange('isCore', checked)}
            />
          </div>
        </div>
      </div>
    </SlidePanelForm>
  );
};
