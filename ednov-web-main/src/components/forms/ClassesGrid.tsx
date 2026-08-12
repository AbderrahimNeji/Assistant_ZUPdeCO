import * as React from 'react';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/forms/Button';
import { cn } from '@/lib/utils';
import { getLevels, getSchoolYears } from '@/services/academic.service';
import type { SchoolClass } from '@/types/school-class.types';

export interface ClassDraft {
  id?: string;
  levelId: string;
  schoolYearId: string;
  name: string;
  studentCount?: number;
}

interface ClassesGridProps {
  value?: ClassDraft[];
  onChange?: (classes: ClassDraft[]) => void;
  disabled?: boolean;
  className?: string;
}

const INPUT_CLASS = cn(
  'w-full px-3 py-2 rounded-lg text-sm',
  'bg-background border border-[var(--color-1-nuance-1)]',
  'text-[var(--color-2-nuance-1)]',
  'dark:border-[var(--color-2-nuance-1)] dark:text-[var(--color-1-nuance-1)]',
  'focus:outline-none focus:ring-2 focus:ring-[var(--color-2-nuance-1)] focus:border-transparent',
  'transition-all duration-200',
  'disabled:opacity-50 disabled:cursor-not-allowed',
);

export const classFromSchoolClass = (sc: SchoolClass): ClassDraft => ({
  id: sc.id,
  levelId: sc.levelId,
  schoolYearId: sc.schoolYearId,
  name: sc.name,
  studentCount: sc.studentCount ?? undefined,
});

export const ClassesGrid: React.FC<ClassesGridProps> = ({
  value = [],
  onChange,
  disabled = false,
  className,
}) => {
  const classes = value || [];

  const { data: levelsRes } = useQuery({
    queryKey: ['levels', 'classes-grid-all'],
    queryFn: () => getLevels({ pageSize: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: schoolYearsRes } = useQuery({
    queryKey: ['schoolYears', 'all'],
    queryFn: () => getSchoolYears({ pageSize: 50 }),
    staleTime: 5 * 60 * 1000,
  });

  const levels = levelsRes?.data ?? [];
  const schoolYears = schoolYearsRes?.data ?? [];

  // Année courante par défaut
  const currentSchoolYearId = React.useMemo(
    () => schoolYears.find((sy) => sy.isCurrent)?.id ?? schoolYears[0]?.id ?? '',
    [schoolYears],
  );

  // Quand la liste des niveaux chargés change, on réinitialise levelId des classes dont le niveau n'est plus dans la liste
  const validLevelIds = React.useMemo(() => new Set(levels.map((l) => l.id)), [levels]);
  const validLevelIdsKey = React.useMemo(
    () =>
      levels
        .map((l) => l.id)
        .sort()
        .join(','),
    [levels],
  );
  const prevValidLevelIdsKey = React.useRef<string>('');
  React.useEffect(() => {
    // Ne s'exécute que si la liste des niveaux valides a réellement changé
    if (validLevelIdsKey === prevValidLevelIdsKey.current) return;
    prevValidLevelIdsKey.current = validLevelIdsKey;

    if (!onChange || classes.length === 0 || validLevelIds.size === 0) return;
    const hasInvalid = classes.some((c) => c.levelId && !validLevelIds.has(c.levelId));
    if (hasInvalid) {
      onChange(
        classes.map((c) => ({ ...c, levelId: validLevelIds.has(c.levelId) ? c.levelId : '' })),
      );
    }
  }, [validLevelIdsKey]);

  const addClass = () => {
    onChange?.([
      ...classes,
      {
        levelId: levels[0]?.id ?? '',
        schoolYearId: currentSchoolYearId,
        name: '',
        studentCount: undefined,
      },
    ]);
  };

  const removeClass = (index: number) => {
    onChange?.(classes.filter((_, i) => i !== index));
  };

  const updateClass = (
    index: number,
    field: keyof ClassDraft,
    val: string | number | undefined,
  ) => {
    const next = [...classes];
    next[index] = { ...next[index], [field]: val };
    onChange?.(next);
  };

  /** Indices des classes en doublon (même nom normalisé + même schoolYearId — correspond à la contrainte DB) */
  const duplicateIndices = React.useMemo(() => {
    const seen = new Map<string, number>();
    const dupes = new Set<number>();
    classes.forEach((c, i) => {
      if (!c.name.trim() || !c.schoolYearId) return;
      const key = `${c.schoolYearId}::${c.name.trim().toLowerCase()}`;
      if (seen.has(key)) {
        dupes.add(seen.get(key)!);
        dupes.add(i);
      } else {
        seen.set(key, i);
      }
    });
    return dupes;
  }, [classes]);

  return (
    <div className={cn('space-y-4', className)}>
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-1-nuance-3)_5%,transparent)]">
          <GraduationCap className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Aucune classe définie</p>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            iconPosition="left"
            onClick={addClass}
            disabled={disabled}
          >
            Ajouter une classe
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {classes.map((cls, index) => (
              <div
                key={cls.id || `new-class-${index}`}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-all',
                  'border-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)]',
                  'bg-[color-mix(in_srgb,var(--color-1-nuance-3)_3%,transparent)]',
                  'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-3)_5%,transparent)]',
                  'hover:border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
                  'animate-fade-in',
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-center w-8 h-8 mt-5 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)] shrink-0">
                  <GraduationCap className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Nom */}
                  <div className="relative">
                    <label
                      htmlFor={`class-name-${index}`}
                      className="text-xs font-medium text-[var(--color-1-nuance-1)] mb-1 block"
                    >
                      Nom <span className="text-error">*</span>
                    </label>
                    <input
                      id={`class-name-${index}`}
                      type="text"
                      value={cls.name}
                      onChange={(e) => updateClass(index, 'name', e.target.value)}
                      disabled={disabled}
                      placeholder="Ex: 6e 1"
                      maxLength={255}
                      className={cn(
                        INPUT_CLASS,
                        (!cls.name || duplicateIndices.has(index)) && 'border-error',
                      )}
                    />
                    {duplicateIndices.has(index) && (
                      <p className="text-xs text-error mt-1">
                        Doublon : même nom pour cette année scolaire
                      </p>
                    )}
                  </div>

                  {/* Niveau */}
                  <div className="relative">
                    <label
                      htmlFor={`class-level-${index}`}
                      className="text-xs font-medium text-[var(--color-1-nuance-1)] mb-1 block"
                    >
                      Niveau <span className="text-error">*</span>
                    </label>
                    <select
                      id={`class-level-${index}`}
                      value={cls.levelId}
                      onChange={(e) => updateClass(index, 'levelId', e.target.value)}
                      disabled={disabled}
                      className={cn(
                        INPUT_CLASS,
                        (!cls.levelId || duplicateIndices.has(index)) && 'border-error',
                      )}
                    >
                      <option value="">-- Sélectionner --</option>
                      {levels.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>
                          {lvl.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Année scolaire */}
                  <div className="relative">
                    <label
                      htmlFor={`class-year-${index}`}
                      className="text-xs font-medium text-[var(--color-1-nuance-1)] mb-1 block"
                    >
                      Année scolaire <span className="text-error">*</span>
                    </label>
                    <select
                      id={`class-year-${index}`}
                      value={cls.schoolYearId}
                      onChange={(e) => updateClass(index, 'schoolYearId', e.target.value)}
                      disabled={disabled}
                      className={cn(INPUT_CLASS, !cls.schoolYearId && 'border-error')}
                    >
                      <option value="">-- Sélectionner --</option>
                      {schoolYears.map((sy) => (
                        <option key={sy.id} value={sy.id}>
                          {sy.code}
                          {sy.isCurrent ? ' (en cours)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Capacité (optionnel) */}
                  {/* <div className="relative">
                    <label
                      htmlFor={`class-count-${index}`}
                      className="text-xs font-medium text-[var(--color-1-nuance-1)] mb-1 block"
                    >
                      Capacité
                    </label>
                    <input
                      id={`class-count-${index}`}
                      type="number"
                      value={cls.studentCount ?? ''}
                      onChange={(e) =>
                        updateClass(
                          index,
                          'studentCount',
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      disabled={disabled}
                      placeholder="Ex: 25"
                      min={0}
                      className={INPUT_CLASS}
                    />
                  </div> */}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeClass(index)}
                  disabled={disabled}
                  icon={Trash2}
                  className="text-error hover:text-error hover:bg-error-light mt-5 shrink-0"
                />
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            iconPosition="left"
            onClick={addClass}
            disabled={disabled || duplicateIndices.size > 0}
            className="w-full"
          >
            Ajouter une classe
          </Button>
        </>
      )}
    </div>
  );
};
