import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ValidateNested, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ParticipantDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ['student', 'tutor', 'volunteer'] })
  @IsIn(['student', 'tutor', 'volunteer'])
  role!: 'student' | 'tutor' | 'volunteer';
}

export class RunAutoAssignmentDto {
  @ApiProperty({ type: [ParticipantDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];
}
