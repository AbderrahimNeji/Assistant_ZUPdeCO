import * as React from 'react';
import { FileText, GraduationCap, ListOrdered } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/forms/Input';
import { Checkbox } from '@/components/forms/Checkbox';
import { toast } from '@/lib/toast';
import {
  getSpecialty,
  updateSpecialty,
  getHighSchoolLevels,
  getSpecialties,
  reorderSpecialties,
} from '@/services/specialties.service';
import type { UpdateSpecialtyDto } from '@/services/specialties.service';
import { SlidePanelForm } from '@/components/common/SlidePanelForm';
import { SpecialtySortableList } from './SpecialtySortableList';

interface EditSpecialtyViewProps {
  specialtyId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditSpecialtyView: React.FC<EditSpecialtyViewProps> = ({
  specialtyId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = React.useState<UpdateSpecialtyDto>({});
  const [levelIds, setLevelIds] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [orderedSpecialtyIds, setOrderedSpecialtyIds] = React.useState<string[] | null>(null);

  const { data: specialty, isLoading } = useQuery({
    queryKey: ['specialty', specialtyId],
    queryFn: () => getSpecialty(specialtyId),
  });

  const { data: highSchoolLevels = [] } = useQuery({
    queryKey: ['specialties', 'levels', 'high'],
    queryFn: getHighSchoolLevels,
  });

  const { data: allSpecialties = [] } = useQuery({
    queryKey: ['specialties', 'all'],
    queryFn: () => getSpecialties(false),
  });

  React.useEffect(() => {
    if (specialty) {
      setFormData({
        code: specialty.code,
        label: specialty.label,
        isActive: specialty.isActive,
      });
      const linked = specialty.levelLinks?.map((ll) => ll.level.id) ?? [];
      setLevelIds(linked);
    }
  }, [specialty]);

  const validate = (data: UpdateSpecialtyDto) => {
    const errs: Record<string, string> = {};
    if (!data.label?.trim()) errs.label = 'Le libellé est obligatoire';
    if (!data.code?.trim()) errs.code = 'Le code est obligatoire';
    return errs;
  };

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateSpecialtyDto) => updateSpecialty(specialtyId, dto),
    onSuccess: () => {
      toast.success('Spécialité modifiée avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err?.response?.data?.message || 'Erreur lors de la modification de la spécialité',
      );
    },
  });

  const handleToggleLevel = (levelId: string, checked: boolean) => {
    setLevelIds((prev) => (checked ? [...prev, levelId] : prev.filter((id) => id !== levelId)));
  };

  const handleSubmit = async () => {
    const errs = validate(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (orderedSpecialtyIds) {
      await reorderSpecialties(orderedSpecialtyIds);
    }
    updateMutation.mutate({
      ...formData,
      code: formData.code?.trim(),
      label: formData.label?.trim(),
      levelIds,
    });
  };

  return (
    <SlidePanelForm
      formType="edit"
      title="Modifier la spécialité"
      subtitle="Modifiez les informations de la spécialité"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={updateMutation.isPending}
      isValid={!!formData.label?.trim() && !!formData.code?.trim()}
      isLoading={isLoading}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <FileText className="w-4 h-4" />
          Informations générales
        </h4>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Libellé"
            value={formData.label ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="Ex: Mathématiques"
            maxLength={255}
            required
            helperText="Nom complet de la spécialité"
            error={errors.label}
            state={errors.label ? 'error' : 'default'}
          />

          <Input
            label="Code"
            value={formData.code ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
            placeholder="Ex: mathematiques"
            maxLength={100}
            required
            helperText="Identifiant unique (slug)"
            error={errors.code}
            state={errors.code ? 'error' : 'default'}
          />

          <Checkbox
            label="Spécialité active"
            checked={formData.isActive ?? true}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
            helperText="Une spécialité inactive n'apparaît pas dans les formulaires"
          />
        </div>
      </div>

      {allSpecialties.length > 1 && (
        <div className="form-section">
          <h4 className="form-section-title">
            <ListOrdered className="w-4 h-4" />
            Ordre dans la liste
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Glissez les spécialités pour les réordonner, puis cliquez sur « Enregistrer l'ordre ».
          </p>
          <SpecialtySortableList
            allSpecialties={allSpecialties}
            currentSpecialtyId={specialtyId}
            onOrderChange={setOrderedSpecialtyIds}
          />
        </div>
      )}

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
                checked={levelIds.includes(level.id)}
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
