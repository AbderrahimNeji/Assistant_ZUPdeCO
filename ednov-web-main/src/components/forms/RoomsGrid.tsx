import * as React from 'react';
import { DoorOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { cn } from '@/lib/utils';
import type { Room } from '@/types/room.types';

interface RoomsGridProps {
  value?: Room[];
  onChange?: (rooms: Room[]) => void;
  disabled?: boolean;
  className?: string;
}

export const RoomsGrid: React.FC<RoomsGridProps> = ({
  value = [],
  onChange,
  disabled = false,
  className,
}) => {
  const rooms = value || [];

  const addRoom = () => {
    const newRoom = {
      name: '',
      label: '',
      capacity: undefined,
    } as Room;
    onChange?.([...rooms, newRoom]);
  };

  const removeRoom = (index: number) => {
    const newRooms = rooms.filter((_, i) => i !== index);
    onChange?.(newRooms);
  };

  const updateRoom = (index: number, field: keyof Room, value: string | number | undefined) => {
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    onChange?.(newRooms);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-1-nuance-3)_5%,transparent)]">
          <DoorOpen className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Aucune salle définie</p>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            iconPosition="left"
            onClick={addRoom}
            disabled={disabled}
          >
            Ajouter une salle
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rooms.map((room, index) => (
              <div
                key={room.id || `new-room-${index}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all',
                  'border-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)]',
                  'bg-[color-mix(in_srgb,var(--color-1-nuance-3)_3%,transparent)]',
                  'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-3)_5%,transparent)]',
                  'hover:border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
                  'animate-fade-in',
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
                  <DoorOpen className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <label
                      htmlFor={`room-name-${index}`}
                      className="text-xs font-medium text-[var(--color-1-nuance-1)] mb-1 block"
                    >
                      Nom de la salle <span className="text-error">*</span>
                    </label>
                    <input
                      id={`room-name-${index}`}
                      type="text"
                      value={room.name}
                      onChange={(e) => updateRoom(index, 'name', e.target.value)}
                      disabled={disabled}
                      placeholder="Ex: Salle 101"
                      maxLength={100}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-sm',
                        'bg-background border border-[var(--color-1-nuance-1)]',
                        'text-[var(--color-2-nuance-1)]',
                        'dark:border-[var(--color-2-nuance-1)] dark:text-[var(--color-1-nuance-1)]',
                        'focus:outline-none focus:ring-2 focus:ring-[var(--color-2-nuance-1)] focus:border-transparent',
                        'transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        !room.name && 'border-error',
                      )}
                    />
                  </div>

                  <div className="relative">
                    <label
                      htmlFor={`room-label-${index}`}
                      className="text-xs font-medium text-[var(--color-1-nuance-1)] mb-1 block"
                    >
                      Label
                    </label>
                    <input
                      id={`room-label-${index}`}
                      type="text"
                      value={room.label || ''}
                      onChange={(e) => updateRoom(index, 'label', e.target.value)}
                      disabled={disabled}
                      placeholder="Ex: Premier étage"
                      maxLength={255}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-sm',
                        'bg-background border border-[var(--color-1-nuance-1)]',
                        'text-[var(--color-2-nuance-1)]',
                        'dark:border-[var(--color-2-nuance-1)] dark:text-[var(--color-1-nuance-1)]',
                        'focus:outline-none focus:ring-2 focus:ring-[var(--color-2-nuance-1)] focus:border-transparent',
                        'transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    />
                  </div>

                  <div className="relative">
                    <label
                      htmlFor={`room-capacity-${index}`}
                      className="text-xs font-medium text-[var(--color-1-nuance-1)] mb-1 block"
                    >
                      Capacité
                    </label>
                    <input
                      id={`room-capacity-${index}`}
                      type="number"
                      value={room.capacity ?? ''}
                      onChange={(e) =>
                        updateRoom(
                          index,
                          'capacity',
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      disabled={disabled}
                      placeholder="Ex: 30"
                      min={0}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-sm',
                        'bg-background border border-[var(--color-1-nuance-1)]',
                        'text-[var(--color-2-nuance-1)]',
                        'dark:border-[var(--color-2-nuance-1)] dark:text-[var(--color-1-nuance-1)]',
                        'focus:outline-none focus:ring-2 focus:ring-[var(--color-2-nuance-1)] focus:border-transparent',
                        'transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRoom(index)}
                  disabled={disabled}
                  icon={Trash2}
                  className="text-error hover:text-error hover:bg-error-light"
                />
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            iconPosition="left"
            onClick={addRoom}
            disabled={disabled}
            className="w-full"
          >
            Ajouter une salle
          </Button>
        </>
      )}
    </div>
  );
};
