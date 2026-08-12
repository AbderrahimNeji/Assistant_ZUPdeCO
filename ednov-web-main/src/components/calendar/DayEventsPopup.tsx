import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarEvent } from '@/types/calendar.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EVENT_TYPE_CONFIG } from './calendar.config';

interface DayEventsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

export const DayEventsPopup: React.FC<DayEventsPopupProps> = ({
  isOpen,
  onClose,
  date,
  events,
  onSelectEvent,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-1-nuance-1)] flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {events.map((event) => {
            const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.session;
            const Icon = config.icon;

            return (
              <button
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                  'hover:shadow-md hover:scale-[1.01]',
                  'bg-card/50 border-[var(--color-1-nuance-3)]/30',
                  'group',
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                    config.bgClass,
                  )}
                >
                  <Icon className={cn('w-5 h-5', config.textClass)} />
                </div>

                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-foreground truncate">{event.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                        config.bgClass,
                        config.textClass,
                      )}
                    >
                      {config.label}
                    </span>
                    {!event.allDay && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(event.startDate, 'HH:mm')}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-[var(--color-2-nuance-1)] transition-colors" />
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground text-center mt-2">
          {events.length} événement{events.length > 1 ? 's' : ''} ce jour
        </p>
      </DialogContent>
    </Dialog>
  );
};
