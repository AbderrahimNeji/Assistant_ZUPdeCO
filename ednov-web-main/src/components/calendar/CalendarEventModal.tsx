import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent, CalendarEventType } from '@/types/calendar.types';
import { InfoModal } from '@/components/common/modals/InfoModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  Star,
  BookOpen,
  Building2,
  User,
  GraduationCap,
  Palmtree,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EVENT_TYPE_CONFIG,
  SESSION_TYPE_CONFIG,
  SESSION_STATUS_CONFIG,
  POSTIT_STATUS_CONFIG,
  THEMATIC_LABELS,
  HOLIDAY_TYPE_LABELS,
} from './calendar.config';
import { ESTABLISHMENT_TYPE_CONFIG } from '@/components/establishments/establishment-configs';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  dayEvents?: CalendarEvent[];
  onEdit?: (sourceId: string, type: string) => void;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  event,
  dayEvents,
  onEdit,
}) => {
  const navigate = useNavigate();
  const [internalView, setInternalView] = React.useState<'list' | 'details'>('list');
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(event);
  const [canGoBack, setCanGoBack] = React.useState(false);

  // Determine initial view when modal opens
  React.useEffect(() => {
    if (!isOpen) return;

    if (dayEvents?.length && dayEvents.length > 1) {
      // Mode liste : plusieurs événements du jour
      setInternalView('list');
      setSelectedEvent(null);
      setCanGoBack(false);
    } else if (dayEvents?.length === 1) {
      // Un seul événement dans la liste : afficher directement les détails
      setInternalView('details');
      setSelectedEvent(dayEvents[0]);
      setCanGoBack(false);
    } else if (event) {
      // Mode détails direct : click sur un événement simple
      setInternalView('details');
      setSelectedEvent(event);
      setCanGoBack(false);
    }
  }, [isOpen, event, dayEvents]);

  // Reset when closing
  React.useEffect(() => {
    if (!isOpen) {
      setInternalView('list');
      setSelectedEvent(null);
      setCanGoBack(false);
    }
  }, [isOpen]);

  const handleEventSelect = (evt: CalendarEvent) => {
    setSelectedEvent(evt);
    setInternalView('details');
    setCanGoBack(true);
  };

  const handleBack = () => {
    setInternalView('list');
    setSelectedEvent(null);
  };

  // Get sorted events by priority
  const getSortedEvents = (events: CalendarEvent[]): CalendarEvent[] => {
    return events.sort((a, b) => {
      const typePriority: Record<CalendarEventType, number> = {
        session: 1,
        postit: 2,
        holiday: 3,
      };
      const aPriority = typePriority[a.type];
      const bPriority = typePriority[b.type];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.startDate.getTime() - b.startDate.getTime();
    });
  };

  if (!event && !dayEvents) return null;

  const getEventTypeIcon = (evt: CalendarEvent) => {
    const config = EVENT_TYPE_CONFIG[evt.type];
    return config ? config.icon : Calendar;
  };

  // Get alternate color for modal content based on event type
  const getAlternateColor = (eventType: CalendarEventType): string => {
    switch (eventType) {
      case 'session':
        return 'color-1'; // color-2 → color-1
      case 'postit':
        return 'color-3'; // color-1 → color-3
      case 'holiday':
        return 'color-2'; // color-3 → color-2
      default:
        return 'color-1';
    }
  };

  // Badge class for alternating A/B with color (used in details view)
  const getBadgeClass = (index: number, colorName: string) =>
    cn(
      'calendar-event-modal-badge',
      index % 2 === 0
        ? `calendar-event-modal-badge-a-${colorName}`
        : `calendar-event-modal-badge-b-${colorName}`,
    );

  // Render list view
  if (internalView === 'list' && dayEvents) {
    return (
      <InfoModal
        open={isOpen}
        onClose={onClose}
        size="lg"
        icon={Calendar}
        iconColor="var(--color-2-nuance-1)"
        iconBgColor="color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)"
        iconSize="lg"
        title={`Événements du ${format(dayEvents[0]?.startDate || new Date(), 'd MMMM', { locale: fr })}`}
        titleColor="var(--foreground)"
        titleSize="xl"
        actions={[
          {
            id: 'close',
            label: 'Fermer',
            onClick: onClose,
            variant: 'secondary' as const,
          },
        ]}
      >
        <div className="space-y-3">
          {getSortedEvents(dayEvents).map((evt) => {
            const config = EVENT_TYPE_CONFIG[evt.type];
            const Icon = config.icon;

            return (
              <button
                key={evt.id}
                onClick={() => handleEventSelect(evt)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--color-1-nuance-3)]/30 hover:border-[var(--color-2-nuance-1)] hover:bg-[var(--color-2-nuance-1)]/5 transition-all"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    config.bgClass,
                  )}
                >
                  <Icon className={cn('w-5 h-5', config.textClass)} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{evt.title}</p>
                  <div className="flex items-center gap-2 text-sm text-foreground mt-1">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        config.bgClass,
                        config.textClass,
                      )}
                    >
                      {config.label}
                    </span>
                    {!evt.allDay && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(evt.startDate, 'HH:mm')} - {format(evt.endDate, 'HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </InfoModal>
    );
  }

  // Render details view
  const currentEvent = selectedEvent || event;
  if (!currentEvent) return null;

  const EventTypeIcon = getEventTypeIcon(currentEvent);

  const renderSessionDetails = () => {
    const typeConfig = SESSION_TYPE_CONFIG[currentEvent.metadata.sessionType];
    const statusConfig =
      SESSION_STATUS_CONFIG[currentEvent.metadata.sessionStatus] || SESSION_STATUS_CONFIG.PLANNED;
    const TypeIcon = typeConfig?.icon;
    const StatusIcon = statusConfig.icon;
    const alternateColor = getAlternateColor('session');

    const estabTypeConfig = currentEvent.metadata.establishmentType
      ? ESTABLISHMENT_TYPE_CONFIG[currentEvent.metadata.establishmentType]
      : undefined;

    const levelNames = currentEvent.metadata.levelNames || [];
    const subjectNames = currentEvent.metadata.subjectNames || [];
    const programName = currentEvent.metadata.programName;

    const participants = currentEvent.metadata.participants || [];
    const tutorsVsc = participants.filter((p) => p.role === 'tutor' || p.role === 'volunteer');
    const students = participants.filter((p) => p.role === 'student');

    return (
      <div className="space-y-4">
        {/* Type & Status badges */}
        <div className="flex flex-wrap gap-2">
          <div className={getBadgeClass(0, alternateColor)}>
            <TypeIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {typeConfig?.label ?? currentEvent.metadata.sessionType}
            </span>
          </div>
          <div className={getBadgeClass(1, alternateColor)}>
            <StatusIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{statusConfig.label}</span>
          </div>
        </div>

        {/* Date & Heure */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border calendar-event-modal-info-box-c2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg calendar-event-modal-icon-box-c2-n1 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-foreground capitalize text-sm">
              {format(currentEvent.startDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground text-sm">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {format(currentEvent.startDate, 'HH:mm')} – {format(currentEvent.endDate, 'HH:mm')}
              </span>
            </div>
          </div>
        </div>

        {/* Établissement */}
        {currentEvent.metadata.establishmentName && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border calendar-event-modal-info-box-c2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg calendar-event-modal-icon-box-c2-n2 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground text-sm">
                  {currentEvent.metadata.establishmentName}
                </p>
                {estabTypeConfig && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      background: `color-mix(in srgb, ${estabTypeConfig.badgeColor} 10%, transparent)`,
                      color: estabTypeConfig.badgeColor,
                      borderColor: `color-mix(in srgb, ${estabTypeConfig.badgeColor} 30%, transparent)`,
                    }}
                  >
                    {React.createElement(estabTypeConfig.icon, { className: 'w-3 h-3' })}
                    {estabTypeConfig.label}
                  </span>
                )}
              </div>
              {currentEvent.metadata.roomName && (
                <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{currentEvent.metadata.roomName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Programme + Niveaux + Matières — ligne compacte de chips */}
        {(programName || levelNames.length > 0 || subjectNames.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {programName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)] text-[var(--color-2-nuance-1)] border border-[var(--color-2-nuance-1)]/20">
                <BookOpen className="w-3 h-3" />
                {programName}
              </span>
            )}
            {levelNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)] text-[var(--color-1-nuance-1)] border border-[var(--color-1-nuance-1)]/20"
              >
                <GraduationCap className="w-3 h-3" />
                {name}
              </span>
            ))}
            {subjectNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[color-mix(in_srgb,var(--color-3-nuance-1)_10%,transparent)] text-[var(--color-3-nuance-1)] border border-[var(--color-3-nuance-1)]/20"
              >
                <BookOpen className="w-3 h-3" />
                {name}
              </span>
            ))}
          </div>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <div className="rounded-xl border border-[var(--color-2-nuance-1)]/20 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-[color-mix(in_srgb,var(--color-2-nuance-1)_5%,transparent)] border-b border-[var(--color-2-nuance-1)]/15">
              <Users className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
              <span className="text-xs font-semibold text-[var(--color-2-nuance-1)] uppercase tracking-wide">
                Participants
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[var(--color-2-nuance-1)]/10">
              {/* Tuteurs / VSC */}
              <div className="p-3">
                <p className="text-xs font-semibold text-[var(--color-2-nuance-1)] mb-2 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Tuteurs / VSC
                  {tutorsVsc.length > 0 && (
                    <span className="ml-auto text-[10px] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_15%,transparent)] text-[var(--color-2-nuance-1)] rounded-full px-1.5 py-0.5 font-bold">
                      {tutorsVsc.length}
                    </span>
                  )}
                </p>
                {tutorsVsc.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun</p>
                ) : (
                  <ul className="space-y-1.5">
                    {tutorsVsc.map((p) => (
                      <li key={`tsc-${p.name}`} className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                          style={{
                            background:
                              'color-mix(in srgb, var(--color-2-nuance-1) 12%, transparent)',
                          }}
                        >
                          <User className="w-3 h-3 text-[var(--color-2-nuance-1)]" />
                        </div>
                        <span className="text-sm text-foreground truncate">{p.name}</span>
                        {p.role === 'volunteer' && (
                          <span
                            className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              background:
                                'color-mix(in srgb, var(--color-3-nuance-1) 12%, transparent)',
                              color: 'var(--color-3-nuance-1)',
                              border:
                                '1px solid color-mix(in srgb, var(--color-3-nuance-1) 30%, transparent)',
                            }}
                          >
                            VSC
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Élèves */}
              <div className="p-3">
                <p className="text-xs font-semibold text-[var(--color-3-nuance-1)] mb-2 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  Élèves
                  {students.length > 0 && (
                    <span className="ml-auto text-[10px] bg-[color-mix(in_srgb,var(--color-3-nuance-1)_15%,transparent)] text-[var(--color-3-nuance-1)] rounded-full px-1.5 py-0.5 font-bold">
                      {students.length}
                    </span>
                  )}
                </p>
                {students.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun</p>
                ) : (
                  <ul className="space-y-1.5">
                    {students.map((p) => (
                      <li key={`stu-${p.name}`} className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                          style={{
                            background:
                              'color-mix(in srgb, var(--color-3-nuance-1) 12%, transparent)',
                          }}
                        >
                          <User className="w-3 h-3 text-[var(--color-3-nuance-1)]" />
                        </div>
                        <span className="text-sm text-foreground truncate flex-1 min-w-0">
                          {p.name}
                        </span>
                        {p.levelName && (
                          <span
                            className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              background:
                                'color-mix(in srgb, var(--color-1-nuance-1) 12%, transparent)',
                              color: 'var(--color-1-nuance-1)',
                              border:
                                '1px solid color-mix(in srgb, var(--color-1-nuance-1) 30%, transparent)',
                            }}
                          >
                            {p.levelName}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {currentEvent.description && (
          <div className="p-3 rounded-xl bg-muted/20 border calendar-event-modal-section-border-c2">
            <p className="text-xs font-medium mb-1.5 calendar-event-modal-section-label-c2">
              Notes internes
            </p>
            <p className="text-sm text-foreground">{currentEvent.description}</p>
          </div>
        )}
      </div>
    );
  };

  const renderPostItDetails = () => {
    const statusConfig =
      POSTIT_STATUS_CONFIG[currentEvent.metadata.postitStatus] || POSTIT_STATUS_CONFIG.en_cours;
    const StatusIcon = statusConfig.icon;
    const thematicLabel =
      THEMATIC_LABELS[currentEvent.metadata.postitThematic] || currentEvent.metadata.postitThematic;
    const alternateColor = getAlternateColor('postit'); // color-3
    const hasPriority = currentEvent.metadata.postitPriority;

    let badgeIndex = 0;

    return (
      <div className="space-y-5">
        {/* Status & Priority & Thematic Row */}
        <div className="flex flex-wrap gap-3">
          {hasPriority && (
            <div className="calendar-event-modal-badge-priority">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">Prioritaire</span>
            </div>
          )}

          <div className={getBadgeClass(badgeIndex++, alternateColor)}>
            <StatusIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{statusConfig.label}</span>
          </div>

          <div className="calendar-event-modal-badge-thematic">
            <Tag className="w-4 h-4" />
            <span className="text-sm font-medium">{thematicLabel}</span>
          </div>
        </div>

        {/* Deadline */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border calendar-event-modal-info-box-c3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg calendar-event-modal-icon-box-c3-n1">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Deadline</p>
            <p className="font-semibold text-foreground">
              {format(currentEvent.startDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
            <p className="text-muted-foreground">{format(currentEvent.startDate, 'HH:mm')}</p>
          </div>
        </div>

        {/* Content */}
        {currentEvent.description && (
          <div className="p-4 rounded-xl bg-muted/20 border calendar-event-modal-section-border-c3">
            <p className="text-sm font-medium mb-2 calendar-event-modal-section-label-c3">
              Contenu
            </p>
            <p className="text-foreground whitespace-pre-wrap">{currentEvent.description}</p>
          </div>
        )}

        {/* Creator */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/20 border calendar-event-modal-creator-border-c3">
          <User className="w-5 h-5" />
          <span className="text-sm">
            <span className="text-muted-foreground">Créé par </span>
            <span className="font-medium text-foreground">
              {currentEvent.metadata.postitCreator}
            </span>
          </span>
        </div>
      </div>
    );
  };

  const renderHolidayDetails = () => {
    const holidayTypeLabel =
      HOLIDAY_TYPE_LABELS[currentEvent.metadata.holidayType] || currentEvent.metadata.holidayType;
    const alternateColor = getAlternateColor('holiday'); // color-2

    let badgeIndex = 0;

    return (
      <div className="space-y-5">
        {/* Type Badges - Alternating */}
        <div className="flex flex-wrap gap-3">
          <div className={getBadgeClass(badgeIndex++, alternateColor)}>
            <Palmtree className="w-4 h-4" />
            <span className="text-sm font-medium">{holidayTypeLabel}</span>
          </div>
          {currentEvent.metadata.holidayRecurring && (
            <div className={getBadgeClass(badgeIndex++, alternateColor)}>
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Récurrent</span>
            </div>
          )}
          {currentEvent.metadata.vacationZoneCode && (
            <div className={getBadgeClass(badgeIndex++, alternateColor)}>
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">
                Zone {currentEvent.metadata.vacationZoneCode}
              </span>
            </div>
          )}
        </div>

        {/* Period - Timeline Style */}
        <div className="p-6 rounded-xl bg-muted/30 border calendar-event-modal-info-box-c1">
          <p className="calendar-event-modal-period-title">Période</p>
          <div className="calendar-event-modal-timeline-wrap">
            <div className="calendar-event-modal-timeline-line" />
            <div className="relative mb-14">
              <div className="calendar-event-modal-timeline-icon-start">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Début</p>
                <p className="text-base font-semibold text-foreground">
                  {format(currentEvent.startDate, 'd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="calendar-event-modal-timeline-icon-end">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Fin</p>
                <p className="text-base font-semibold text-foreground">
                  {format(currentEvent.endDate, 'd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {currentEvent.description && (
          <div className="p-4 rounded-xl bg-muted/20 border calendar-event-modal-section-border-c1">
            <p className="text-sm font-medium mb-2 calendar-event-modal-section-label-c1">
              Description
            </p>
            <p className="text-foreground">{currentEvent.description}</p>
          </div>
        )}
      </div>
    );
  };

  const canEdit = currentEvent.type !== 'holiday';

  const handleEdit = () => {
    if (currentEvent.type === 'session') {
      navigate(`/dashboard/sessions?edit=${currentEvent.sourceId}`);
      onClose();
    } else if (currentEvent.type === 'postit') {
      if (onEdit) {
        onEdit(currentEvent.sourceId, currentEvent.type);
      }
      onClose();
    }
  };

  const actions = [
    {
      id: 'close',
      label: 'Fermer',
      onClick: onClose,
      preset: 'modal-cancel' as const,
    },
    ...(canEdit
      ? [
          {
            id: 'edit',
            label: 'Modifier',
            onClick: handleEdit,
            preset: 'modal-edit' as const,
          },
        ]
      : []),
  ];

  // Get icon color based on event type
  const getIconColor = () => {
    switch (currentEvent.type) {
      case 'session':
        return 'var(--color-2-nuance-1)';
      case 'postit':
        return 'var(--color-1-nuance-1)';
      case 'holiday':
        return 'var(--color-3-nuance-1)';
      default:
        return 'var(--muted-foreground)';
    }
  };

  const getIconBgColor = () => {
    switch (currentEvent.type) {
      case 'session':
        return 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)';
      case 'postit':
        return 'color-mix(in srgb, var(--color-1-nuance-1) 15%, transparent)';
      case 'holiday':
        return 'color-mix(in srgb, var(--color-3-nuance-1) 15%, transparent)';
      default:
        return 'color-mix(in srgb, var(--muted) 50%, transparent)';
    }
  };

  return (
    <InfoModal
      open={isOpen}
      onClose={onClose}
      size="lg"
      icon={EventTypeIcon}
      iconColor={getIconColor()}
      iconBgColor={getIconBgColor()}
      iconSize="lg"
      title={currentEvent.title}
      titleColor="var(--foreground)"
      titleSize="xl"
      actions={actions}
      dataEventType={currentEvent.type}
    >
      {canGoBack && (
        <button
          onClick={handleBack}
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg hover:bg-[var(--color-2-nuance-1)]/10 transition-colors text-[var(--color-2-nuance-1)] font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste
        </button>
      )}
      {currentEvent.type === 'session' && renderSessionDetails()}
      {currentEvent.type === 'postit' && renderPostItDetails()}
      {currentEvent.type === 'holiday' && renderHolidayDetails()}
    </InfoModal>
  );
};
