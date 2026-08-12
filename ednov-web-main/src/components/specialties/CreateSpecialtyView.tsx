import * as React from 'react';
import { FileText, GraduationCap, ListOrdered } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { Checkbox } from '@/components/forms/Checkbox';
import { toast } from '@/lib/toast';
import {
  createSpecialty,
  getHighSchoolLevels,
  getSpecialties,
  reorderSpecialties,
} from '@/services/specialties.service';
import type { CreateSpecialtyDto, Specialty } from '@/services/specialties.service';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { SpecialtySortableList, NEW_SPECIALTY_PLACEHOLDER_ID } from './SpecialtySortableList';

interface CreateSpecialtyViewProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const toSlug = (label: string) =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

export const CreateSpecialtyView: React.FC<CreateSpecialtyViewProps> = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState<CreateSpecialtyDto>({
    code: '',
    label: '',
    isActive: true,
    levelIds: [],
  });
  const [codeManuallyEdited, setCodeManuallyEdited] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [orderedIds, setOrderedIds] = React.useState<string[] | null>(null);

  const { data: highSchoolLevels = [] } = useQuery({
    queryKey: ['specialties', 'levels', 'high'],
    queryFn: getHighSchoolLevels,
  });

  const { data: allSpecialties = [] } = useQuery({
    queryKey: ['specialties', 'all'],
    queryFn: () => getSpecialties(false),
  });

  const validate = (data: CreateSpecialtyDto) => {
    const errs: Record<string, string> = {};
    if (!data.label?.trim()) errs.label = 'Le libellé est obligatoire';
    if (!data.code?.trim()) errs.code = 'Le code est obligatoire';
    return errs;
  };

  const createMutation = useMutation({
    mutationFn: async (dto: CreateSpecialtyDto) => {
      const created: Specialty = await createSpecialty(dto);
      if (orderedIds) {
        const finalOrder = orderedIds.map((id) =>
          id === NEW_SPECIALTY_PLACEHOLDER_ID ? created.id : id,
        );
        await reorderSpecialties(finalOrder);
        queryClient.invalidateQueries({ queryKey: ['specialties'] });
      }
      return created;
    },
    onSuccess: () => {
      toast.success('Spécialité créée avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la création de la spécialité');
    },
  });

  const handleLabelChange = (value: string) => {
    const updates: Partial<CreateSpecialtyDto> = { label: value };
    if (!codeManuallyEdited) {
      updates.code = toSlug(value);
    }
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleCodeChange = (value: string) => {
    setCodeManuallyEdited(true);
    setFormData((prev) => ({ ...prev, code: value }));
  };

  const handleToggleLevel = (levelId: string, checked: boolean) => {
    setFormData((prev) => {
      const current = prev.levelIds ?? [];
      const updated = checked ? [...current, levelId] : current.filter((id) => id !== levelId);
      return { ...prev, levelIds: updated };
    });
  };

  const handleSubmit = () => {
    const errs = validate(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    createMutation.mutate({
      ...formData,
      code: formData.code.trim(),
      label: formData.label.trim(),
    });
  };

  return (
    <SlidePanelForm
      formType="create"
      title="Créer une spécialité"
      subtitle="Renseignez les informations de la spécialité"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Créer"
      isSubmitting={createMutation.isPending}
      isValid={!formData.label?.trim() === false && !formData.code?.trim() === false}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <FileText className="w-4 h-4" />
          Informations générales
        </h4>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Libellé"
            value={formData.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Ex: Mathématiques"
            maxLength={255}
            required
            helperText="Nom complet de la spécialité"
            error={errors.label}
            state={errors.label ? 'error' : 'default'}
          />

          <Input
            label="Code"
            value={formData.code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Ex: mathematiques"
            maxLength={100}
            required
            helperText="Identifiant unique (slug auto-généré depuis le libellé)"
            error={errors.code}
            state={errors.code ? 'error' : 'default'}
          />

          <Checkbox
            label="Spécialité active"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
            helperText="Une spécialité inactive n'apparaît pas dans les formulaires"
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">
          <ListOrdered className="w-4 h-4" />
          Ordre dans la liste
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          Glissez la nouvelle spécialité pour la positionner parmi les existantes.
        </p>
        <SpecialtySortableList
          allSpecialties={allSpecialties}
          currentSpecialtyId={NEW_SPECIALTY_PLACEHOLDER_ID}
          newSpecialtyLabel={formData.label}
          onOrderChange={setOrderedIds}
        />
      </div>

      {highSchoolLevels.length > 0 && (
        <div className="form-section">
          <h4 className="form-section-title">
            <GraduationCap className="w-4 h-4" />
            Niveaux lycée associés
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {highSchoolLevels.map((level) => (
              <Checkbox
                key={level.id}
                id={`level-${level.id}`}
                label={`${level.code} — ${level.label}`}
                checked={(formData.levelIds ?? []).includes(level.id)}
                onCheckedChange={(checked) => handleToggleLevel(level.id, checked)}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Sélectionnez les niveaux lycée concernés par cette spécialité (optionnel)
          </p>
        </div>
      )}
    </SlidePanelForm>
  );
};
