import * as React from 'react';
import { Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/styles/components/AvailabilityGrid.css';

export interface AvailabilitySlot {
  day: number;
  start: string;
  end: string;
}

interface AvailabilityGridProps {
  value?: { weekly: AvailabilitySlot[] };
  onChange?: (value: { weekly: AvailabilitySlot[] }) => void;
  disabled?: boolean;
  className?: string;
  maxVisibleRows?: number;
}

const DAYS = [
  { value: 1, label: 'Lundi', short: 'Lun' },
  { value: 2, label: 'Mardi', short: 'Mar' },
  { value: 3, label: 'Mercredi', short: 'Mer' },
  { value: 4, label: 'Jeudi', short: 'Jeu' },
  { value: 5, label: 'Vendredi', short: 'Ven' },
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function generateTimeSlots(): { label: string; start: string; end: string }[] {
  const slots = [];
  // From 7:00 to 19:30 (start), each slot is 1h duration, 30min step
  // Last slot: 19:30–20:30
  for (let startMinutes = 7 * 60; startMinutes <= 19 * 60 + 30; startMinutes += 30) {
    const endMinutes = startMinutes + 60;
    const startH = Math.floor(startMinutes / 60);
    const startM = startMinutes % 60;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const start = `${pad(startH)}:${pad(startM)}`;
    const end = `${pad(endH)}:${pad(endM)}`;
    slots.push({ label: `${start}-${end}`, start, end });
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

type DayAvailability = {
  [timeSlotLabel: string]: boolean;
};

type GridData = {
  [day: number]: DayAvailability;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const checkOverlap = (
  slotStart: string,
  slotEnd: string,
  fixedStart: string,
  fixedEnd: string,
): boolean => {
  const slotStartMin = timeToMinutes(slotStart);
  const slotEndMin = timeToMinutes(slotEnd);
  const fixedStartMin = timeToMinutes(fixedStart);
  const fixedEndMin = timeToMinutes(fixedEnd);

  return slotStartMin < fixedEndMin && slotEndMin > fixedStartMin;
};

const slotsToGrid = (slots: AvailabilitySlot[]): GridData => {
  const grid: GridData = {};

  slots.forEach((slot) => {
    if (!grid[slot.day]) {
      grid[slot.day] = {};
    }

    TIME_SLOTS.forEach((timeSlot) => {
      if (slot.start === timeSlot.start && slot.end === timeSlot.end) {
        grid[slot.day][timeSlot.label] = true;
      }
    });
  });

  return grid;
};

const gridToSlots = (grid: GridData): AvailabilitySlot[] => {
  const slots: AvailabilitySlot[] = [];

  Object.keys(grid).forEach((dayStr) => {
    const day = Number(dayStr);
    const dayData = grid[day];
    const checkedSlots: (typeof TIME_SLOTS)[0][] = [];

    TIME_SLOTS.forEach((timeSlot) => {
      if (dayData[timeSlot.label]) {
        checkedSlots.push(timeSlot);
      }
    });

    if (checkedSlots.length === 0) return;

    let currentGroup: (typeof TIME_SLOTS)[0][] = [checkedSlots[0]];

    for (let i = 1; i < checkedSlots.length; i++) {
      const prevSlot = checkedSlots[i - 1];
      const currentSlot = checkedSlots[i];

      const prevEndMin = timeToMinutes(prevSlot.end);
      const currentStartMin = timeToMinutes(currentSlot.start);

      if (currentStartMin <= prevEndMin) {
        currentGroup.push(currentSlot);
      } else {
        slots.push({
          day,
          start: currentGroup[0].start,
          end: currentGroup[currentGroup.length - 1].end,
        });
        currentGroup = [currentSlot];
      }
    }

    slots.push({
      day,
      start: currentGroup[0].start,
      end: currentGroup[currentGroup.length - 1].end,
    });
  });

  return slots;
};

export const AvailabilityGrid: React.FC<AvailabilityGridProps> = ({
  value = { weekly: [] },
  onChange,
  disabled = false,
  className,
  maxVisibleRows,
}) => {
  const [gridData, setGridData] = React.useState<GridData>(() => slotsToGrid(value.weekly || []));
  const [showAll, setShowAll] = React.useState(false);
  const isInternalUpdate = React.useRef(false);

  React.useEffect(() => {
    if (!isInternalUpdate.current) {
      setGridData(slotsToGrid(value.weekly || []));
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleCellClick = (day: number, timeSlot: (typeof TIME_SLOTS)[0]) => {
    if (disabled) return;

    const newGrid = { ...gridData };
    const isCurrentlyChecked = gridData[day]?.[timeSlot.label];

    if (!newGrid[day]) newGrid[day] = {};
    newGrid[day][timeSlot.label] = !isCurrentlyChecked;

    setGridData(newGrid);
    isInternalUpdate.current = true;
    onChange?.({ weekly: gridToSlots(newGrid) });
  };

  const isCellChecked = (day: number, timeSlot: (typeof TIME_SLOTS)[0]): boolean => {
    return gridData[day]?.[timeSlot.label] || false;
  };

  const getCellTitle = (isChecked: boolean): string => {
    if (disabled) return '';
    return isChecked
      ? 'Créneau sélectionné - Cliquer pour désélectionner'
      : 'Cliquer pour sélectionner ce créneau';
  };

  const hasHiddenSlots = maxVisibleRows && TIME_SLOTS.length > maxVisibleRows && !showAll;

  return (
    <div className={cn('availability-grid-container', className)}>
      <div className="availability-section">
        <div className="availability-legend">
          <div className="availability-legend-item">
            <div className="availability-legend-color availability-legend-checked"></div>
            <span>Disponible</span>
          </div>
          <div className="availability-legend-item">
            <div className="availability-legend-color availability-legend-disabled"></div>
            <span>Indisponible</span>
          </div>
        </div>

        <div className="availability-timetable">
          <div className="availability-timetable-inner">
            <div className="availability-timetable-grid">
              <div className="availability-timetable-header">
                <div className="availability-timetable-header-cell">Horaires</div>
                {TIME_SLOTS.map((slot, index) => {
                  const isHidden = maxVisibleRows && !showAll && index >= maxVisibleRows;
                  return (
                    <div
                      key={slot.label}
                      className={cn(
                        'availability-timetable-time',
                        isHidden && 'availability-timeslot-hidden',
                      )}
                    >
                      <div className="availability-timetable-time-text">{slot.label}</div>
                    </div>
                  );
                })}
              </div>

              {DAYS.map((day) => (
                <div key={day.value} className="availability-day-column">
                  <div className="availability-day-header">{day.short}</div>
                  {TIME_SLOTS.map((timeSlot, index) => {
                    const isHidden = maxVisibleRows && !showAll && index >= maxVisibleRows;
                    const isChecked = isCellChecked(day.value, timeSlot);
                    const cellId = `availability-${day.value}-${timeSlot.label}`;
                    return (
                      <div
                        key={timeSlot.label}
                        className={cn(
                          'availability-timeslot',
                          isHidden && 'availability-timeslot-hidden',
                        )}
                      >
                        <input
                          type="checkbox"
                          id={cellId}
                          checked={isChecked}
                          onChange={() => handleCellClick(day.value, timeSlot)}
                          disabled={disabled}
                          className="availability-timeslot-checkbox"
                          aria-label={`${day.label} ${timeSlot.label}`}
                        />
                        <label
                          htmlFor={cellId}
                          className={cn(
                            'availability-timeslot-inner',
                            isChecked
                              ? 'availability-timeslot-checked'
                              : 'availability-timeslot-unchecked',
                            disabled && 'availability-timeslot-disabled',
                          )}
                          title={getCellTitle(isChecked)}
                        >
                          <div className="availability-timeslot-status">
                            {isChecked ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {maxVisibleRows && TIME_SLOTS.length > maxVisibleRows && (
            <div className="availability-show-more">
              {!showAll ? (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="availability-show-more-btn"
                  disabled={disabled}
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>
                    Afficher la suite ({TIME_SLOTS.length - maxVisibleRows} créneaux masqués)
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="availability-show-more-btn"
                  disabled={disabled}
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>Réduire</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
