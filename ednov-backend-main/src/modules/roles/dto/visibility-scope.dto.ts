import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

const VISIBILITY_SCOPES = [
  'unrestricted',
  'same_establishment',
  'same_program',
  'same_department',
  'managed_by',
  'same_establishment_or_managed_by',
  'assignment',
  'relation_overlap',
] as const;

export type VisibilityScopeType = (typeof VISIBILITY_SCOPES)[number];

export class EntityConditionDto {
  @ApiPropertyOptional({ description: 'Entity field name to match against (e.g. session_format, type)' })
  @IsString()
  field: string;

  @ApiPropertyOptional({ type: [String], description: 'Values to match for this condition' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  values: string[];

  @ApiPropertyOptional({ enum: VISIBILITY_SCOPES })
  @IsEnum(VISIBILITY_SCOPES)
  scope: VisibilityScopeType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relations?: string[];

  @ApiPropertyOptional({ enum: ['AND', 'OR'] })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  operator?: 'AND' | 'OR';
}

export class VisibilityScopeDto {
  @ApiPropertyOptional({ enum: VISIBILITY_SCOPES })
  @IsOptional()
  @IsEnum(VISIBILITY_SCOPES)
  scope?: VisibilityScopeType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRoleCode?: string;

  @ApiPropertyOptional({ enum: ['AND', 'OR'] })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  operator?: 'AND' | 'OR';

  @ApiPropertyOptional({ type: [EntityConditionDto], description: 'Per-subcategory scope overrides' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntityConditionDto)
  entityConditions?: EntityConditionDto[];
}

// ─── NEW UI-FRIENDLY RULES SCHEMA DTOs ──────────────────────────────────────

export class RuleEntityFilterDto {
  @ApiPropertyOptional({ description: 'Entity field to filter on (e.g. type, sessionFormat)' })
  @IsString()
  field!: string;

  @ApiPropertyOptional({ enum: ['in', 'equals', 'not_in'] })
  @IsEnum(['in', 'equals', 'not_in'])
  operator!: 'in' | 'equals' | 'not_in';

  @ApiPropertyOptional({ type: [String], description: 'Values to match' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  values!: string[];
}

export class RuleReadScopeDto {
  @ApiPropertyOptional({ type: [String], description: 'Relation keys (e.g. establishment, program)' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  relations!: string[];

  @ApiPropertyOptional({ enum: ['AND', 'OR'], default: 'OR' })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  logic?: 'AND' | 'OR';
}

export class RoleBindingRuleDto {
  @ApiPropertyOptional({ description: 'Unique rule ID' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ type: RuleEntityFilterDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleEntityFilterDto)
  entityFilter?: RuleEntityFilterDto | null;

  @ApiPropertyOptional({ type: RuleReadScopeDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleReadScopeDto)
  read?: RuleReadScopeDto | null;

  @ApiPropertyOptional({ type: [String], description: 'Allowed action element IDs' })
  @IsArray()
  @IsString({ each: true })
  actions!: string[];
}

export class RoleBindingRulesDto {
  @ApiPropertyOptional({ type: [RoleBindingRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleBindingRuleDto)
  @ArrayMinSize(1)
  rules!: RoleBindingRuleDto[];
}
