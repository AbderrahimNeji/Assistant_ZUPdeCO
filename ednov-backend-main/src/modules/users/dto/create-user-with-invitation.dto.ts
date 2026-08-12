import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  Min,
  ValidateIf,
  IsBoolean,
  IsObject,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PROFESSIONAL_SITUATION_VALUES,
  type ProfessionalSituation,
} from '../professional-situation';

export class CreateUserWithInvitationDto {
  @ApiProperty({
    description: 'Method to send invitation',
    enum: ['email', 'phone'],
    example: 'email',
  })
  @IsEnum(['email', 'phone'])
  inviteBy: 'email' | 'phone';

  @ApiPropertyOptional({ example: 'user@example.com' })
  @ValidateIf((o) => o.inviteBy === 'email')
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+33612345678' })
  @ValidateIf((o) => o.inviteBy === 'phone')
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ description: 'Role IDs to assign (must belong to the same company)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ description: 'Profile ID to assign' })
  @IsOptional()
  @IsUUID('4')
  profileId?: string;

  @ApiPropertyOptional({ description: 'Subject IDs for tutors/students' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  subjects?: string[];

  @ApiPropertyOptional({ description: 'Subject names for tutors/students (denormalized)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  subjectNames?: string[];

  @ApiPropertyOptional({ description: 'Availability schedule (for tutors/students)' })
  @IsOptional()
  @IsObject()
  availability?: any;

  @ApiPropertyOptional({ description: 'Is the student a minor', example: false })
  @IsOptional()
  @IsBoolean()
  isMinor?: boolean;

  @ApiPropertyOptional({ description: 'Does the student have special needs', example: false })
  @IsOptional()
  @IsBoolean()
  hasSpecialNeeds?: boolean;

  @ApiPropertyOptional({ description: 'Type of special needs (ulis, upe2a, segpa, autre)', example: 'ulis' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  specialNeedsType?: string;

  @ApiPropertyOptional({ description: 'Free-text note when specialNeedsType is "autre"', example: 'Dyscalculie' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialNeedsNote?: string;

  @ApiPropertyOptional({
    description: 'Guardian contact info (required if isMinor is true)',
    example: { name: 'Jane Doe', phone: '+33612345678', email: 'jane@example.com' },
  })
  @IsOptional()
  @IsObject()
  guardianContact?: any;

  @ApiPropertyOptional({
    description: 'VSC automatic reports frequencies configuration',
    example: { daily: false, weekly: true },
  })
  @IsOptional()
  @IsObject()
  vscReportsFrequencies?: {
    daily: boolean;
    weekly: boolean;
  };

  @ApiPropertyOptional({
    description: 'Establishments the user belongs to (must belong to the same company); if provided, at least one is required',
    type: [String],
  })
  @IsOptional()
  @ValidateIf((o) => o.establishmentIds !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  establishmentIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional manager or coordinator user id (same company)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.managedById != null)
  @IsUUID('4')
  managedById?: string | null;

  @ApiPropertyOptional({
    description: 'Engagement start date (tutors/volunteers)',
    example: '2024-09-01',
  })
  @IsOptional()
  @IsString()
  engagementStartDate?: string;

  @ApiPropertyOptional({
    description: 'Engagement end date (tutors/volunteers)',
    example: '2025-06-30',
  })
  @IsOptional()
  @IsString()
  engagementEndDate?: string;

  @ApiPropertyOptional({
    description: 'Professional situation — required when inviting a user with the tutor role',
    enum: PROFESSIONAL_SITUATION_VALUES,
    example: 'employee',
  })
  @IsOptional()
  @IsIn([...PROFESSIONAL_SITUATION_VALUES])
  professionalSituation?: ProfessionalSituation;

  @ApiPropertyOptional({
    description: 'Target hours to achieve (tutor/volunteer objective)',
    example: 40,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetHours?: number;
}
