import * as React from 'react';
import { FileText, ListOrdered } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { Select, type SelectOption } from '@/components/forms/Select';
import { toast } from '@/lib/toast';
import { createLevel, getLevels, reorderLevels } from '@/services/academic.service';
import type { CreateLevelDto, Level } from '@/types/level.types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { levelValidationSchema } from '@/utils/validation-schemas';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { LevelSortableList, NEW_LEVEL_PLACEHOLDER_ID } from './LevelSortableList';

interface CreateLevelViewProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const CYCLE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Aucun' },
  { value: 'primary', label: 'Primaire' },
  { value: 'middle', label: 'Collège' },
  { value: 'high', label: 'Lycée' },
];

export const CreateLevelView: React.FC<CreateLevelViewProps> = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState<CreateLevelDto>({
    code: '',
    label: '',
    educationCycle: undefined,
    minAge: undefined,
    maxAge: undefined,
    status: 'active',
  });
  const [orderedLevelIds, setOrderedLevelIds] = React.useState<string[] | null>(null);

  const validation = useFormValidation(levelValidationSchema);

  const { data: allLevels = [] } = useQuery({
    queryKey: ['levels', 'all'],
    queryFn: () => getLevels({ pageSize: 100 }),
    select: (res) => res.data,
  });

  const createMutation = useMutation({
    mutationFn: async (dto: CreateLevelDto) => {
      const created: Level = await createLevel(dto);
      if (orderedLevelIds) {
        const finalOrder = orderedLevelIds.map((id) =>
          id === NEW_LEVEL_PLACEHOLDER_ID ? created.id : id,
        );
        await reorderLevels(finalOrder);
        queryClient.invalidateQueries({ queryKey: ['levels'] });
      }
      return created;
    },
    onSuccess: () => {
      toast.success('Niveau créé avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la création du niveau');
    },
  });

  const isSubmitting = createMutation.isPending;

  const handleFieldChange = (field: keyof CreateLevelDto, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const updatedData = { ...formData, [field]: value };
    validation.validateField(field, value, updatedData);
    validation.markAsTouched(field);
    validation.markAsDirty(field);

    if (field === 'minAge' && formData.maxAge !== undefined) {
      validation.validateField('maxAge', formData.maxAge, updatedData);
    }
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
      title="Créer un niveau"
      subtitle="Renseignez les informations du niveau"
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
            placeholder="Ex: 6EME"
            maxLength={50}
            required
            helperText="Code unique identifiant le niveau"
            state={validation.getFieldState('code')}
            error={validation.getFieldError('code')}
          />

          <Input
            label="Libellé"
            value={formData.label}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            onBlur={() => handleBlur('label')}
            placeholder="Ex: Sixième"
            maxLength={255}
            required
            helperText="Nom complet du niveau"
            state={validation.getFieldState('label')}
            error={validation.getFieldError('label')}
          />
        </div>

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
          <Input
            label="Âge minimum"
            type="number"
            value={formData.minAge?.toString() || ''}
            onChange={(e) =>
              handleFieldChange(
                'minAge',
                e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
              )
            }
            onBlur={() => handleBlur('minAge')}
            placeholder="Ex: 11"
            min={3}
            max={25}
            state={validation.getFieldState('minAge')}
            error={validation.getFieldError('minAge')}
          />

          <Input
            label="Âge maximum"
            type="number"
            value={formData.maxAge?.toString() || ''}
            onChange={(e) =>
              handleFieldChange(
                'maxAge',
                e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
              )
            }
            onBlur={() => handleBlur('maxAge')}
            placeholder="Ex: 12"
            min={3}
            max={25}
            state={validation.getFieldState('maxAge')}
            error={validation.getFieldError('maxAge')}
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <ListOrdered className="w-4 h-4" />
          Ordre d'affichage
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          Glissez le nouveau niveau pour le positionner parmi les existants.
        </p>
        <LevelSortableList
          allLevels={allLevels}
          currentLevelId={NEW_LEVEL_PLACEHOLDER_ID}
          newLevelLabel={formData.label}
          onOrderChange={setOrderedLevelIds}
        />
      </div>
    </SlidePanelForm>
  );
};
