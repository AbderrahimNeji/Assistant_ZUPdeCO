import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AvailabilitySlot {
  day: number;
  start: string;
  end: string;
}

interface DetailAvailabilityGridProps {
  slots: AvailabilitySlot[];
  variant?: 'compact' | 'full';
  className?: string;
}

const DAYS_MAP: Record<number, string> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
};

const DAYS_SHORT_MAP: Record<number, string> = {
  0: 'Dim',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
};

export const DetailAvailabilityGrid: React.FC<DetailAvailabilityGridProps> = ({
  slots,
  variant = 'compact',
  className,
}) => {
  if (!slots || slots.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune disponibilité renseignée</p>;
  }

  if (variant === 'compact') {
    return (
      <div className={cn('detail-availability-compact', className)}>
        {[...slots]
          .sort((a, b) => a.day - b.day)
          .map((slot, index) => (
            <div key={`${slot.day}-${slot.start}-${index}`} className="detail-availability-slot">
              <div className="detail-availability-slot-icon">
                <Clock className="w-5 h-5 text-[var(--color-2-nuance-1)]" />
              </div>
              <div className="detail-availability-slot-content">
                <div className="detail-availability-slot-day">{DAYS_MAP[slot.day]}</div>
                <div className="detail-availability-slot-time">
                  {slot.start} - {slot.end}
                </div>
              </div>
            </div>
          ))}
      </div>
    );
  }

  const uniqueDays = Array.from(new Set(slots.map((s) => s.day))).sort((a, b) => a - b);

  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const allTimeSlots = slots.flatMap((slot) => [parseTime(slot.start), parseTime(slot.end)]);
  const minTime = Math.min(...allTimeSlots);
  const maxTime = Math.max(...allTimeSlots);

  const timeSlots: number[] = [];
  for (let time = minTime; time <= maxTime; time += 60) {
    timeSlots.push(time);
  }

  const isSlotAvailable = (day: number, time: number): boolean => {
    return slots.some((slot) => {
      const slotStart = parseTime(slot.start);
      const slotEnd = parseTime(slot.end);
      return slot.day === day && time >= slotStart && time < slotEnd;
    });
  };

  return (
    <div className={cn('detail-availability-grid-full', className)}>
      <div className="detail-availability-grid-header">
        <div className="detail-availability-grid-corner" />
        {uniqueDays.map((day) => (
          <div key={day} className="detail-availability-grid-day-header">
            <span className="hidden sm:inline">{DAYS_MAP[day]}</span>
            <span className="sm:hidden">{DAYS_SHORT_MAP[day]}</span>
          </div>
        ))}
      </div>
      <div className="detail-availability-grid-body">
        {timeSlots.map((time) => (
          <React.Fragment key={time}>
            <div className="detail-availability-grid-time-label">{formatTime(time)}</div>
            {uniqueDays.map((day) => (
              <div
                key={`${day}-${time}`}
                className={cn(
                  'detail-availability-grid-cell',
                  isSlotAvailable(day, time)
                    ? 'detail-availability-grid-cell-available'
                    : 'detail-availability-grid-cell-empty',
                )}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
