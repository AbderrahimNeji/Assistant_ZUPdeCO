import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ValidateNested, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class StudentTutorPairDto {
  @ApiProperty()
  @IsUUID()
  studentUserId!: string;

  @ApiProperty()
  @IsUUID()
  tutorUserId!: string;
}

export class ParticipantDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ['student', 'tutor', 'volunteer'] })
  @IsIn(['student', 'tutor', 'volunteer'])
  role!: 'student' | 'tutor' | 'volunteer';
}

export class SetAssignmentsDto {
  @ApiProperty({ type: [StudentTutorPairDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentTutorPairDto)
  pairs!: StudentTutorPairDto[];

  @ApiProperty({ type: [ParticipantDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];
}
