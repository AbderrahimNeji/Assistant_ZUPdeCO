import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { CalendarAggregatorService } from './calendar-aggregator.service';
import { CalendarEventsResponseDto, CalendarEventType } from './dto/calendar-event-response.dto';
import { FirebaseJwtGuard } from '../../auth/firebase-jwt.guard';
import { parseLocalDate, parseLocalDateEndOfDay } from '../../common/utils/date-parser.utils';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('Calendar')
@ApiBearerAuth('Firebase')
@Controller('calendar')
@UseGuards(FirebaseJwtGuard)
export class CalendarController {
  constructor(private readonly calendarAggregatorService: CalendarAggregatorService) {}

  @Get('events')
  @ApiOperation({
    summary: 'List aggregated calendar events',
    description:
      'Sessions, post-its and holidays for the current user’s company, within the given local date range.',
  })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-01-01', description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-01-31', description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({
    name: 'types',
    required: false,
    description: 'Comma-separated subset of: session, postit, holiday',
    example: 'session,holiday',
  })
  @ApiQuery({
    name: 'vacationZoneId',
    required: false,
    description: 'Optional vacation zone UUID for holiday filtering',
  })
  @ApiResponse({ status: 200, description: 'Aggregated events', type: CalendarEventsResponseDto })
  @ApiResponse({ status: 400, description: 'Missing or invalid dates' })
  async getEvents(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
    @Query('types') typesStr?: string,
    @Query('vacationZoneId', new ParseUUIDPipe({ optional: true })) vacationZoneId?: string,
  ): Promise<CalendarEventsResponseDto> {
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException('startDate and endDate are required');
    }

    const startDate = parseLocalDate(startDateStr);
    const endDate = parseLocalDateEndOfDay(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    let types: CalendarEventType[] = ['session', 'postit', 'holiday'];
    if (typesStr) {
      const requestedTypes = typesStr.split(',').map((t) => t.trim());
      const validTypes = requestedTypes.filter((t) =>
        ['session', 'postit', 'holiday'].includes(t),
      ) as CalendarEventType[];

      if (validTypes.length > 0) {
        types = validTypes;
      }
    }

    const events = await this.calendarAggregatorService.getAggregatedEvents(
      req.user.uid,
      req.user.company_id,
      startDate,
      endDate,
      types,
      vacationZoneId,
    );

    return {
      events,
      total: events.length,
    };
  }
}
