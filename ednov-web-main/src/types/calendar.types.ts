export type CalendarEventType = 'session' | 'postit' | 'holiday';

export interface CalendarParticipant {
  name: string;
  role: 'tutor' | 'volunteer' | 'student';
  levelName?: string;
}

export interface CalendarEventMetadata {
  sessionType?: string;
  establishment?: string;
  establishmentName?: string;
  establishmentType?: string;
  room?: string;
  roomName?: string;
  program?: string;
  programName?: string;
  levels?: string[];
  levelNames?: string[];
  subjects?: string[];
  subjectNames?: string[];
  maxStudents?: number;
  sessionStatus?: string;
  participants?: CalendarParticipant[];
  postitThematic?: string;
  postitStatus?: string;
  postitPriority?: boolean;
  postitCreator?: string;
  holidayType?: string;
  holidayRecurring?: boolean;
  vacationZoneId?: string;
  vacationZoneCode?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  color: string;
  type: CalendarEventType;
  sourceId: string;
  metadata: CalendarEventMetadata;
}
