import * as React from 'react';
import { FileText } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { toast } from '@/lib/toast';
import { createActivityType } from '@/services/academic.service';
import type { CreateActivityTypeDto } from '@/types/activity.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { activityTypeValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';

interface CreateActivityTypeViewProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateActivityTypeView: React.FC<CreateActivityTypeViewProps> = ({
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = React.useState<CreateActivityTypeDto>({
    code: '',
    label: '',
    description: '',
    status: 'active',
  });

  const validation = useFormValidation(activityTypeValidationSchema);

  const createMutation = useMutation({
    mutationFn: (dto: CreateActivityTypeDto) => createActivityType(dto),
    onSuccess: () => {
      toast.success("Type d'activité créé avec succès !");
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Erreur lors de la création du type d'activité");
    },
  });

  const isSubmitting = createMutation.isPending;

  const handleFieldChange = (field: keyof CreateActivityTypeDto, value: string | number) => {
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
      title="Créer un type d'activité"
      subtitle="Renseignez les informations du type d'activité"
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
            placeholder="Ex: AIDE_DEVOIRS"
            maxLength={50}
            required
            helperText="Code unique identifiant le type"
            state={validation.getFieldState('code')}
            error={validation.getFieldError('code')}
          />

          <Input
            label="Libellé"
            value={formData.label}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            onBlur={() => handleBlur('label')}
            placeholder="Ex: Aide aux devoirs"
            maxLength={255}
            required
            helperText="Nom complet du type d'activité"
            state={validation.getFieldState('label')}
            error={validation.getFieldError('label')}
          />
        </div>

        <Input
          label="Description"
          value={formData.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="Ex: Accompagnement aux devoirs"
          maxLength={500}
          state={validation.getFieldState('description')}
          error={validation.getFieldError('description')}
        />
      </div>
    </SlidePanelForm>
  );
};
