import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class CalendarEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  allDay: boolean;

  @ApiProperty()
  color: string;

  @ApiProperty({ enum: ['session', 'postit', 'holiday'] })
  type: CalendarEventType;

  @ApiProperty()
  sourceId: string;

  @ApiProperty({
    type: 'object',
    description: 'Event-specific fields (session, post-it, or holiday details)',
    additionalProperties: true,
  })
  metadata: CalendarEventMetadata;
}

export class CalendarEventsResponseDto {
  @ApiProperty({ type: [CalendarEventResponseDto] })
  events: CalendarEventResponseDto[];

  @ApiProperty()
  total: number;
}
