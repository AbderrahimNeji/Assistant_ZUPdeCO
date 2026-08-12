import * as React from 'react';
import { FileText } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { Select, type SelectOption } from '@/components/forms/Select';
import { Checkbox } from '@/components/forms/Checkbox';
import { toast } from '@/lib/toast';
import { createSubject } from '@/services/academic.service';
import type { CreateSubjectDto } from '@/types/subject.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { subjectValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

interface CreateSubjectViewProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const CYCLE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Aucun' },
  { value: 'primary', label: 'Primaire' },
  { value: 'middle', label: 'Collège' },
  { value: 'high', label: 'Lycée' },
];

export const CreateSubjectView: React.FC<CreateSubjectViewProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = React.useState<CreateSubjectDto>({
    code: '',
    label: '',
    description: '',
    educationCycle: undefined,
    isCore: false,
    status: 'active',
  });

  const validation = useFormValidation(subjectValidationSchema);

  const createMutation = useMutation({
    mutationFn: (dto: CreateSubjectDto) => createSubject(dto),
    onSuccess: () => {
      toast.success('Matière créée avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la création de la matière');
    },
  });

  const isSubmitting = createMutation.isPending;

  const handleFieldChange = (
    field: keyof CreateSubjectDto,
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

    createMutation.mutate(formData);
  };

  return (
    <SlidePanelForm
      formType="create"
      title="Créer une matière"
      subtitle="Renseignez les informations de la matière"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Créer"
      isSubmitting={isSubmitting}
      isValid={validation.isFormValid()}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <FileText className="w-4 h-4" />
          Informations générales
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Code"
            value={formData.code}
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
            value={formData.label}
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
