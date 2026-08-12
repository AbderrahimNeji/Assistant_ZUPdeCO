import * as React from 'react';
import { FileText } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { Select, type SelectOption } from '@/components/forms/Select';
import { DatePicker } from '@/components/forms/DatePicker';
import { toast } from '@/lib/toast';
import { createProgram } from '@/services/academic.service';
import type { CreateProgramDto } from '@/types/program.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { programValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

interface CreateProgramViewProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'active', label: 'Actif' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'closed', label: 'Clôturé' },
];

export const CreateProgramView: React.FC<CreateProgramViewProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = React.useState<CreateProgramDto>({
    establishmentId: '',
    schoolYearId: '',
    label: '',
    code: '',
    name: '',
    description: '',
    startDate: undefined,
    endDate: undefined,
    status: 'draft',
  });

  const validation = useFormValidation(programValidationSchema);

  const createMutation = useMutation({
    mutationFn: (dto: CreateProgramDto) => createProgram(dto),
    onSuccess: () => {
      toast.success('Programme créé avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la création du programme');
    },
  });

  const isSubmitting = createMutation.isPending;

  const handleFieldChange = (field: keyof CreateProgramDto, value: string | number | undefined) => {
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
      title="Créer un programme"
      subtitle="Renseignez les informations du programme"
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
            placeholder="Ex: BAC_GEN"
            maxLength={50}
            required
            helperText="Code unique identifiant le programme"
            state={validation.getFieldState('code')}
            error={validation.getFieldError('code')}
          />

          <Input
            label="Libellé"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="Ex: Baccalauréat Général"
            maxLength={255}
            required
            helperText="Nom complet du programme"
            state={validation.getFieldState('name')}
            error={validation.getFieldError('name')}
          />
        </div>

        <Input
          label="Description"
          value={formData.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Ex: Préparation au baccalauréat"
          maxLength={500}
          state={validation.getFieldState('description')}
          error={validation.getFieldError('description')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Date de début"
            value={formData.startDate || ''}
            onChange={(value) => handleFieldChange('startDate', value)}
            onBlur={() => handleBlur('startDate')}
            state={validation.getFieldState('startDate')}
            error={validation.getFieldError('startDate')}
          />

          <DatePicker
            label="Date de fin"
            value={formData.endDate || ''}
            onChange={(value) => handleFieldChange('endDate', value)}
            onBlur={() => handleBlur('endDate')}
            minDate={formData.startDate}
            state={validation.getFieldState('endDate')}
            error={validation.getFieldError('endDate')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Statut"
            options={STATUS_OPTIONS}
            value={formData.status || 'draft'}
            onChange={(value) =>
              handleFieldChange('status', value as 'draft' | 'active' | 'suspended' | 'closed')
            }
            onBlur={() => handleBlur('status')}
            helperText="Brouillon: modifiable. Actif: visible. Suspendu: masqué. Clôturé: archivé."
            state={validation.getFieldState('status')}
            error={validation.getFieldError('status')}
          />
        </div>
      </div>
    </SlidePanelForm>
  );
};
