import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsObject,
  MaxLength,
  Min,
  Max,
  IsDateString,
  IsArray,
  IsUUID,
  ValidateNested,
  IsEmail,
  ValidateIf,
  IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateSchoolClassInEstablishmentDto {
  @ApiPropertyOptional({ description: 'ID de la classe existante (pour mise à jour)', example: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @ApiProperty({ example: '6e 1' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'uuid-level' })
  @IsUUID('4')
  levelId: string;

  @ApiProperty({ example: 'uuid-school-year' })
  @IsUUID('4')
  schoolYearId: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  studentCount?: number;
}

export class EstablishmentContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.contactEmail != null && o.contactEmail !== '')
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ 
    description: 'Fonction du contact (ex: Référent, Directeur, CPE, etc.)',
    example: 'CPE'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fonction?: string;
}

export class CreateEstablishmentDto {
  @ApiPropertyOptional({ example: '0010001A' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  uaiCode?: string;

  @ApiProperty({ example: 'Collège Example' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Collège Example Officiel' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  officialName?: string;

  @ApiProperty({ enum: ['primaire', 'college', 'lycee', 'professionnel', 'other'] })
  @IsEnum(['primaire', 'college', 'lycee', 'professionnel', 'other'])
  type: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'closed'], default: 'active' })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'closed'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ default: 'FR' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: '48.8566', description: 'Latitude (decimal degrees)' })
  @IsOptional()
  @IsNumberString({}, { message: 'latitude must be a numeric string' })
  latitude?: string;

  @ApiPropertyOptional({ example: '2.3522', description: 'Longitude (decimal degrees)' })
  @IsOptional()
  @IsNumberString({}, { message: 'longitude must be a numeric string' })
  longitude?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: ['none', 'weekly', 'ab'] })
  @IsOptional()
  @IsEnum(['none', 'weekly', 'ab'])
  calendarType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.contactEmail != null && o.contactEmail !== '')
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ type: [EstablishmentContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstablishmentContactDto)
  contacts?: EstablishmentContactDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  volunteerQuota?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  govData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Valeur IPS de l\'établissement (ex: 95.30)', example: 95.3 })
  @IsOptional()
  @IsNumber({}, { message: 'ipsValue must be a number' })
  @Min(0)
  @Max(200)
  @Type(() => Number)
  ipsValue?: number;

  @ApiPropertyOptional({ description: 'Année scolaire de référence pour l\'IPS', example: '2022-2023' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ipsYear?: string;

  @ApiPropertyOptional({ enum: ['public', 'private'], description: 'Catégorie établissement (public/privé)' })
  @IsOptional()
  @IsEnum(['public', 'private'])
  establiCategory?: string;

  @ApiPropertyOptional({ enum: ['rep', 'rep_plus', 'none'], description: "Réseau d'éducation prioritaire" })
  @IsOptional()
  @IsEnum(['rep', 'rep_plus', 'none'])
  priorityNetwork?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'Quartier prioritaire de la ville (QPV)' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  isQpv?: boolean;

  @ApiPropertyOptional({ type: Boolean, description: 'Reconduction prévue N+1' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  renewalNextYear?: boolean;

  @ApiPropertyOptional({ type: Boolean, description: 'Présence dispositif Devoirs Faits' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  hasDevoirsFaits?: boolean;

  @ApiPropertyOptional({ type: Boolean, description: 'Présence internat' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  hasInternat?: boolean;

  @ApiPropertyOptional({ type: Number, description: "Niveau d'implication établissement (1 à 5)", minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  involvementLevel?: number;

  @ApiPropertyOptional({
    enum: ['very_bad', 'bad', 'average', 'good', 'very_good'],
    description: 'Qualité relation partenaire',
  })
  @IsOptional()
  @IsEnum(['very_bad', 'bad', 'average', 'good', 'very_good'])
  partnerRelationshipQuality?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'Convention signée' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  conventionSigned?: boolean;

  @ApiPropertyOptional({ description: 'Engagement start date', example: '2024-09-01' })
  @IsOptional()
  @IsDateString()
  engagementStartDate?: string;

  @ApiPropertyOptional({ description: 'Engagement end date', example: '2025-06-30' })
  @IsOptional()
  @IsDateString()
  engagementEndDate?: string;

  @ApiPropertyOptional({ 
    description: 'Manager user ID who manages this establishment',
    type: String,
    example: 'uuid-manager'
  })
  @IsOptional()
  @IsUUID('4')
  managedById?: string;

  @ApiPropertyOptional({ 
    description: 'Array of coordinator user IDs who manage this establishment',
    type: [String],
    example: ['uuid-1', 'uuid-2']
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  coordinatorIds?: string[];

  @ApiPropertyOptional({ 
    description: 'Array of rooms for this establishment (only for update)',
    type: [Object],
    example: [{ id: 'uuid', name: 'Salle 101', label: 'A1', capacity: 30 }]
  })
  @IsOptional()
  @IsArray()
  rooms?: Array<{
    id?: string;
    name: string;
    label?: string;
    capacity?: number;
  }>;
  @ApiPropertyOptional({
    description: 'Global specialty IDs offered by this lycée (ignored if type is not lycee)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  offeredSpecialtyIds?: string[];

  @ApiPropertyOptional({
    description: 'Classes à créer avec l\'établissement (atomique)',
    type: () => [CreateSchoolClassInEstablishmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSchoolClassInEstablishmentDto)
  classes?: CreateSchoolClassInEstablishmentDto[];
}
