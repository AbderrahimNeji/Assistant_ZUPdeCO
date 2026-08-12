import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
  IsEmail,
  ArrayMinSize,
  ValidateIf,
  IsEnum,
  IsIn,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PROFESSIONAL_SITUATION_VALUES,
  type ProfessionalSituation,
} from '../professional-situation';

export class CreateUserDto {
  @ApiPropertyOptional({ description: 'Firebase UID of the user (from Firebase Auth). If not provided, will be auto-generated.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  firebaseUid?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

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

  @ApiPropertyOptional({ example: '+33612345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

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

  @ApiPropertyOptional({ description: 'School class ID (establishment must match user establishments)' })
  @IsOptional()
  @IsUUID('4')
  schoolClassId?: string;

  @ApiPropertyOptional({ description: 'Lycée specialty IDs (for students; must be offered by lycée)' })
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

  @ApiPropertyOptional({ description: 'Availability schedule (for tutors/students)' })
  @IsOptional()
  @IsObject()
  availability?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Does the student have special needs', example: false })
  @IsOptional()
  @IsBoolean()
  hasSpecialNeeds?: boolean;

  @ApiPropertyOptional({ description: 'Type of special needs', maxLength: 50, example: 'dyslexie' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  specialNeedsType?: string;

  @ApiPropertyOptional({ description: 'Additional note for special needs', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialNeedsNote?: string;

  @ApiPropertyOptional({ description: 'Is the student in a disability situation', example: false })
  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;

  @ApiPropertyOptional({
    description: 'Types of disability (moteur, visuel, auditif, intellectuel, psychique, cognitif, tsa, tnd, dys, maladies, polyhandicap, plurihandicap, autre)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  disabilityTypes?: string[];

  @ApiPropertyOptional({ description: 'Free-text note when disability type includes "autre"' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  disabilityOtherNote?: string;

  @ApiPropertyOptional({
    description: 'Guardian contact info (required if isMinor is true)',
    example: { name: 'Jane Doe', phone: '+33612345678', email: 'jane@example.com' },
  })
  @IsOptional()
  @IsObject()
  guardianContact?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Role IDs to assign (must belong to the same company)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

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
    description: 'Professional situation — required when the user has the tutor role',
    enum: PROFESSIONAL_SITUATION_VALUES,
    example: 'employee',
  })
  @IsOptional()
  @IsIn([...PROFESSIONAL_SITUATION_VALUES])
  professionalSituation?: ProfessionalSituation;
}
