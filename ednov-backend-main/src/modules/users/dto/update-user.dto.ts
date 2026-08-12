import {
  IsString,
  IsOptional,
  IsEnum,
  IsIn,
  IsBoolean,
  MaxLength,
  IsObject,
  IsArray,
  IsUUID,
  IsNumber,
  Min,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { USER_ACCOUNT_STATUS_VALUES, type UserStatus } from '../user-status';
import {
  PROFESSIONAL_SITUATION_VALUES,
  type ProfessionalSituation,
} from '../professional-situation';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ example: 'contact@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+33612345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @ApiPropertyOptional({
    enum: USER_ACCOUNT_STATUS_VALUES,
    description:
      'Élève: registered | accompanied | deactivated. Autres rôles: active | deactivated.',
  })
  @IsOptional()
  @IsIn([...USER_ACCOUNT_STATUS_VALUES])
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Date of birth', example: '2000-01-01' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Gender', enum: ['M', 'F', 'O'], example: 'M' })
  @IsOptional()
  @IsEnum(['M', 'F', 'O'])
  gender?: 'M' | 'F' | 'O';

  @ApiPropertyOptional({ description: 'Address line 1', example: '12 rue de la République' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Department', example: 'Paris' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '75001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Paris' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Country (ISO2)', example: 'FR' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ description: 'Level ID (academic level)' })
  @IsOptional()
  @IsUUID('4')
  levelId?: string;

  @ApiPropertyOptional({
    description: 'School class ID (must belong to one of the user establishments); null to clear',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.schoolClassId !== undefined && o.schoolClassId !== null)
  @IsUUID('4')
  schoolClassId?: string | null;

  @ApiPropertyOptional({
    description:
      'Lycée specialty IDs (student only; must be offered by the student lycée, or already on profile)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specialtyIds?: string[];

  @ApiPropertyOptional({ description: 'Medical notes', example: 'Allergies: peanuts' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  medicalNotes?: string;

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
    description: 'Professional situation (tutor profile only)',
    enum: PROFESSIONAL_SITUATION_VALUES,
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

  @ApiPropertyOptional({ description: 'Does the student have special needs', example: false })
  @IsOptional()
  @IsBoolean()
  hasSpecialNeeds?: boolean;

  @ApiPropertyOptional({ description: 'Special needs type (ulis, upe2a, segpa, allophones, autre)', example: 'ulis' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  specialNeedsType?: string;

  @ApiPropertyOptional({ description: 'Special needs note (required when type = autre)', example: 'Précision du besoin' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialNeedsNote?: string;

  @ApiPropertyOptional({ description: 'Is the student in a disability situation', example: false })
  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;

  @ApiPropertyOptional({
    description: 'Types of disability (array of keys: moteur, visuel, auditif, intellectuel, psychique, cognitif, tsa, tnd, dys, maladies, polyhandicap, plurihandicap, autre)',
    type: [String],
    example: ['moteur', 'visuel'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  disabilityTypes?: string[];

  @ApiPropertyOptional({ description: 'Free-text note when disability type includes "autre"', example: 'Précision' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  disabilityOtherNote?: string;

  @ApiPropertyOptional({ description: 'Reason for deactivation (stored in student_status_history when status → deactivated)', example: 'Fin de suivi' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deactivationReason?: string;

  @ApiPropertyOptional({
    description: 'Free-text note when deactivationReason = Autre (stored in student_status_history.reason_note)',
    example: 'Précision du motif',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deactivationReasonNote?: string;

  @ApiPropertyOptional({
    description: 'Exit reason for tutors/volunteers (stored on user_profiles.exit_reason)',
    enum: ["Fin d'engagement anticipé", 'Ne donne pas suite', 'Autre'],
    example: "Fin d'engagement anticipé",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  exitReason?: string;

  @ApiPropertyOptional({ description: 'Free text when exitReason = Autre', example: 'Précision du motif' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  exitReasonNote?: string;

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
    description: 'Replace role assignments (omit to leave unchanged; must not be empty if provided). role_label is stored from roles.label.',
    type: [String],
  })
  @IsOptional()
  @ValidateIf((o) => o.roleIds !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({
    description: 'Replace establishment assignments (omit to leave unchanged; must not be empty if provided)',
    type: [String],
  })
  @IsOptional()
  @ValidateIf((o) => o.establishmentIds !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  establishmentIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional manager or coordinator user id (same company); set null to clear',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.managedById !== undefined && o.managedById !== null)
  @IsUUID('4')
  managedById?: string | null;
}
