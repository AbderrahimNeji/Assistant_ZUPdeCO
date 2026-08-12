import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Brackets } from 'typeorm';
import { Session } from '../sessions/entities/session.entity';
import type { SessionType } from '../sessions/session-types.constants';
import { PostIt, type PostItColor } from '../post-its/entities/post-it.entity';
import { Holiday } from '../academic/entities/holiday.entity';
import { PostItShare } from '../post-its/entities/post-it-share.entity';
import { CalendarEventResponseDto, CalendarEventType, CalendarParticipant } from './dto/calendar-event-response.dto';
import { toLocalDateString } from '../../common/utils/date-parser.utils';

/**
 * Color mapping for calendar events
 * 
 * These colors are aligned with the branding color scheme:
 * - Sessions use Color 1 (primary action color) variations
 * - Post-its use Color 3 (accent) variations  
 * - Holidays use Color 2 (secondary/titles) variations
 * 
 * Default branding colors (can be overridden per company):
 * - Color 1: #FF6B43 (orange) - for sessions/actions
 * - Color 2: #1E3A5F (dark blue) - for holidays/secondary
 * - Color 3: #FF8A65 (coral) - for post-its/accents
 * 
 * TODO: In the future, fetch these from company branding settings
 */
const SESSION_TYPE_COLORS: Record<SessionType, string> = {
  homework_help: '#3B82F6', // Blue - distinct from post-its
  individual_tutoring: '#10B981', // Green - tutoring
  workshop: '#F59E0B', // Amber - workshops
  whole_class: '#6366F1', // Indigo - whole class
  group_tutoring: '#14B8A6', // Teal - collective tutoring (Tutorat)
};

const COLOR_MAP = {
  session: SESSION_TYPE_COLORS,
  postit: {
    jaune: '#FFF740',     // Bright yellow
    orange: '#FFB347',    // Light orange
    rose: '#FFB6C1',      // Light pink
    vert: '#90EE90',      // Light green
    bleu: '#87CEEB',      // Sky blue
    violet: '#DDA0DD',    // Plum
    turquoise: '#40E0D0', // Turquoise
    'blanc-casse': '#F5F0E8', // Default / scheduled post-its
    depasse: '#FF6B6B',   // Coral red for overdue
  } satisfies Record<PostItColor | 'depasse', string>,
  holiday: '#6B7280',     // Gray - neutral for holidays
};

@Injectable()
export class CalendarAggregatorService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(PostIt)
    private readonly postItRepository: Repository<PostIt>,
    @InjectRepository(Holiday)
    private readonly holidayRepository: Repository<Holiday>,
    @InjectRepository(PostItShare)
    private readonly postItShareRepository: Repository<PostItShare>,
  ) {}

  async getAggregatedEvents(
    userId: string,
    companyId: string,
    startDate: Date,
    endDate: Date,
    types: CalendarEventType[] = ['session', 'postit', 'holiday'],
    vacationZoneId?: string,
  ): Promise<CalendarEventResponseDto[]> {
    const events: CalendarEventResponseDto[] = [];

    if (types.includes('session')) {
      const sessionEvents = await this.getSessionEvents(companyId, startDate, endDate);
      events.push(...sessionEvents);
    }

    if (types.includes('postit')) {
      const postitEvents = await this.getPostItEvents(userId, companyId, startDate, endDate);
      events.push(...postitEvents);
    }

    if (types.includes('holiday')) {
      const holidayEvents = await this.getHolidayEvents(companyId, startDate, endDate, vacationZoneId);
      events.push(...holidayEvents);
    }

    return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  private async getSessionEvents(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEventResponseDto[]> {
    const sessions = await this.sessionRepository.find({
      where: {
        companyId,
        sessionDate: Between(startDate, endDate),
        deletedAt: null as any,
      },
      relations: [
        'establishment',
        'room',
        'program',
        'sessionParticipants',
        'sessionParticipants.user',
        'sessionParticipants.user.userProfiles',
        'sessionParticipants.user.userProfiles.level',
      ],
    });

    return sessions.map((session) => {
      const sessionStart = new Date(session.sessionDate);
      const [startHour, startMinute] = session.startTime.split(':').map(Number);
      sessionStart.setHours(startHour, startMinute, 0, 0);

      const sessionEnd = new Date(session.sessionDate);
      const [endHour, endMinute] = session.endTime.split(':').map(Number);
      sessionEnd.setHours(endHour, endMinute, 0, 0);

      const participants: CalendarParticipant[] = (session.sessionParticipants || []).map((sp) => {
        const user = sp.user;
        const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Inconnu';
        const studentProfile = sp.role === 'student'
          ? user?.userProfiles?.[0]
          : undefined;
        return {
          name,
          role: sp.role,
          levelName: studentProfile?.level?.label || undefined,
        };
      });

      return {
        id: `session-${session.id}`,
        title: `Session ${session.type.replace('_', ' ')}`,
        description: session.internalNotes || undefined,
        startDate: sessionStart,
        endDate: sessionEnd,
        allDay: false,
        color:
          SESSION_TYPE_COLORS[session.type as SessionType] ?? SESSION_TYPE_COLORS.whole_class,
        type: 'session' as CalendarEventType,
        sourceId: session.id,
        metadata: {
          sessionType: session.type,
          establishment: session.establishmentId,
          establishmentName: session.establishment?.name,
          establishmentType: session.establishment?.type || undefined,
          room: session.roomId || undefined,
          roomName: session.room?.name,
          program: session.programId || undefined,
          programName: session.program?.name,
          levels: session.levelIds || [],
          levelNames: session.levelNames || [],
          subjects: session.subjectIds || [],
          subjectNames: session.subjectNames || [],
          maxStudents: session.maxStudents || undefined,
          sessionStatus: session.status,
          participants,
        },
      };
    });
  }

  private async getPostItEvents(
    userId: string,
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEventResponseDto[]> {
    const postItsQuery = this.postItRepository
      .createQueryBuilder('postIt')
      .leftJoinAndSelect('postIt.createdBy', 'createdBy')
      .leftJoin('postIt.shares', 'share')
      .where('postIt.companyId = :companyId', { companyId })
      .andWhere('postIt.deletedAt IS NULL')
      .andWhere('postIt.isArchived = false')
      .andWhere('postIt.deadline IS NOT NULL')
      .andWhere('postIt.deadline BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('(postIt.createdById = :userId OR share.userId = :userId)', { userId });

    const postIts = await postItsQuery.getMany();

    return postIts.map((postIt) => {
      const isOverdue = postIt.status !== 'done' && postIt.deadline && 
        toLocalDateString(postIt.deadline) < toLocalDateString(new Date());
      const color = isOverdue ? COLOR_MAP.postit.depasse : COLOR_MAP.postit[postIt.color];

      return {
        id: `postit-${postIt.id}`,
        title: postIt.title,
        description: postIt.content,
        startDate: postIt.deadline!,
        endDate: postIt.deadline!,
        allDay: false,
        color,
        type: 'postit' as CalendarEventType,
        sourceId: postIt.id,
        metadata: {
          postitThematic: postIt.thematic,
          postitStatus: postIt.status,
          postitPriority: postIt.isPriority,
          postitCreator: postIt.createdBy
            ? `${postIt.createdBy.firstName || ''} ${postIt.createdBy.lastName || ''}`.trim() || postIt.createdBy.email || 'Unknown'
            : 'Unknown',
        },
      };
    });
  }

  private async getHolidayEvents(
    companyId: string,
    startDate: Date,
    endDate: Date,
    vacationZoneId?: string,
  ): Promise<CalendarEventResponseDto[]> {
    const qb = this.holidayRepository
      .createQueryBuilder('holiday')
      .leftJoinAndSelect('holiday.establishment', 'establishment')
      .leftJoinAndSelect('holiday.vacationZone', 'vacationZone')
      .where('holiday.companyId = :companyId', { companyId })
      .andWhere('holiday.deletedAt IS NULL')
      .andWhere('holiday.startDate <= :endDate', { endDate })
      .andWhere('holiday.endDate >= :startDate', { startDate });

    if (vacationZoneId) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('holiday.vacationZoneId IS NULL').orWhere('holiday.vacationZoneId = :vzId', {
            vzId: vacationZoneId,
          });
        }),
      );
    }

    const holidays = await qb.getMany();

    return holidays.map((holiday) => ({
      id: `holiday-${holiday.id}`,
      title: holiday.name,
      description: holiday.description || undefined,
      startDate: new Date(holiday.startDate),
      endDate: new Date(holiday.endDate),
      allDay: true,
      color: COLOR_MAP.holiday,
      type: 'holiday' as CalendarEventType,
      sourceId: holiday.id,
      metadata: {
        holidayType: holiday.type,
        holidayRecurring: holiday.isRecurringYearly,
        establishment: holiday.establishmentId || undefined,
        establishmentName: holiday.establishment?.name,
        vacationZoneId: holiday.vacationZoneId || undefined,
        vacationZoneCode: holiday.vacationZone?.code,
      },
    }));
  }
}
