import * as React from 'react';
import { FileText, Calendar, CheckCircle2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { Select, type SelectOption } from '@/components/forms/Select';
import { DatePicker } from '@/components/forms/DatePicker';
import { toast } from '@/lib/toast';
import { getProgram, updateProgram } from '@/services/academic.service';
import type { UpdateProgramDto } from '@/types/program.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { programValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'active', label: 'Actif' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'closed', label: 'Clôturé' },
];

interface EditProgramViewProps {
  programId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditProgramView: React.FC<EditProgramViewProps> = ({
  programId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = React.useState<UpdateProgramDto>({});

  const validation = useFormValidation(programValidationSchema);

  const { data: program, isLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => getProgram(programId),
  });

  React.useEffect(() => {
    if (program) {
      const formatDate = (date: string | Date | null | undefined): string => {
        if (!date) return '';
        if (typeof date === 'string') return date;
        return new Date(date).toISOString().split('T')[0];
      };

      const initialData = {
        code: program.code,
        name: program.name,
        description: program.description || '',
        startDate: formatDate(program.startDate),
        endDate: formatDate(program.endDate),
        status: program.status,
      };
      setFormData(initialData);
      validation.validateInitialFormData(initialData);
    }
  }, [program]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateProgramDto) => updateProgram(programId, dto),
    onSuccess: () => {
      toast.success('Programme modifié avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification du programme');
    },
  });

  const handleFieldChange = (field: keyof UpdateProgramDto, value: string | number | undefined) => {
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
      title="Modifier le programme"
      subtitle="Modifiez les informations du programme"
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
            placeholder="Ex: BAC_GEN"
            maxLength={50}
            required
            helperText="Code unique identifiant le programme"
            state={validation.getFieldState('code')}
            error={validation.getFieldError('code')}
          />

          <Input
            label="Libellé"
            value={formData.name || ''}
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
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <Calendar className="w-4 h-4" />
          Dates
        </h4>

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
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <CheckCircle2 className="w-4 h-4" />
          Statut
        </h4>

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
