# Guidelines de Développement Backend - EdNov

## 🎯 RÈGLES ABSOLUES À SUIVRE

### ⚠️ IMPORTANT : Ces règles DOIVENT être respectées pour tout nouveau module/endpoint

## 1. ARCHITECTURE MODULAIRE

### Structure d'un Module

```
src/modules/[nom-module]/
├── dto/
│   ├── create-[entity].dto.ts
│   ├── update-[entity].dto.ts
│   └── [entity]-response.dto.ts
├── entities/
│   └── [entity].entity.ts
├── [module].controller.ts
├── [module].service.ts
└── [module].module.ts
```

### Exemple : Module Students

```
src/modules/students/
├── dto/
│   ├── create-student.dto.ts
│   ├── update-student.dto.ts
│   └── student-response.dto.ts
├── entities/
│   └── student.entity.ts
├── students.controller.ts
├── students.service.ts
└── students.module.ts
```

---

## 2. ENTITIES (TypeORM)

### Template d'Entity

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '@/modules/companies/entities/company.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
```

### Règles pour les Entities

1. ✅ **Toujours** ajouter `company_id` (multi-tenancy)
2. ✅ **Toujours** ajouter `created_at`, `updated_at`, `deleted_at` (audit trail + soft delete)
3. ✅ Utiliser `snake_case` pour les noms de colonnes
4. ✅ Utiliser `PascalCase` pour les noms de classes
5. ✅ Utiliser `@ManyToOne` pour les relations
6. ✅ Utiliser `JSONB` pour les configurations flexibles

---

## 3. DTOs (Data Transfer Objects)

### Create DTO

```typescript
import { IsString, IsEmail, IsOptional, IsDateString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '2000-01-01', required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
```

### Update DTO

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}
```

### Response DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class StudentResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  birthDate: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @Exclude()
  deletedAt: Date;

  @Exclude()
  companyId: string;
}
```

---

## 4. SERVICES

### Template de Service

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuditService } from '@/modules/audit/audit.service';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(companyId: string): Promise<Student[]> {
    return this.studentsRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { id, companyId },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async create(dto: CreateStudentDto, companyId: string, userId: string): Promise<Student> {
    const student = this.studentsRepository.create({
      ...dto,
      companyId,
    });

    const saved = await this.studentsRepository.save(student);

    // Audit log
    await this.auditService.log({
      userId,
      companyId,
      action: 'CREATE',
      entityType: 'Student',
      entityId: saved.id,
      changes: dto,
    });

    return saved;
  }

  async update(id: string, dto: UpdateStudentDto, companyId: string, userId: string): Promise<Student> {
    const student = await this.findOne(id, companyId);

    Object.assign(student, dto);
    const updated = await this.studentsRepository.save(student);

    // Audit log
    await this.auditService.log({
      userId,
      companyId,
      action: 'UPDATE',
      entityType: 'Student',
      entityId: id,
      changes: dto,
    });

    return updated;
  }

  async remove(id: string, companyId: string, userId: string): Promise<void> {
    const student = await this.findOne(id, companyId);

    // Soft delete
    await this.studentsRepository.softDelete(id);

    // Audit log
    await this.auditService.log({
      userId,
      companyId,
      action: 'DELETE',
      entityType: 'Student',
      entityId: id,
    });
  }
}
```

### Règles pour les Services

1. ✅ **Toujours** vérifier `companyId` (multi-tenancy)
2. ✅ **Toujours** utiliser soft delete (`softDelete()`)
3. ✅ **Toujours** logger avec `AuditService`
4. ✅ Lever `NotFoundException` si ressource introuvable
5. ✅ Lever `ForbiddenException` si pas de permission

---

## 5. CONTROLLERS

### Template de Controller

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { FirebaseAuthGuard } from '@/common/guards/firebase-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('api/v1/students')
@UseGuards(FirebaseAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all students' })
  @ApiResponse({ status: 200, type: [StudentResponseDto] })
  async findAll(@CurrentUser() user: UserPayload): Promise<StudentResponseDto[]> {
    const students = await this.studentsService.findAll(user.companyId);
    return students.map(s => plainToClass(StudentResponseDto, s));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<StudentResponseDto> {
    const student = await this.studentsService.findOne(id, user.companyId);
    return plainToClass(StudentResponseDto, student);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({ status: 201, type: StudentResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateStudentDto,
    @CurrentUser() user: UserPayload,
  ): Promise<StudentResponseDto> {
    const student = await this.studentsService.create(dto, user.companyId, user.uid);
    return plainToClass(StudentResponseDto, student);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a student' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: UserPayload,
  ): Promise<StudentResponseDto> {
    const student = await this.studentsService.update(id, dto, user.companyId, user.uid);
    return plainToClass(StudentResponseDto, student);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a student' })
  @ApiResponse({ status: 204, description: 'Student deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<void> {
    await this.studentsService.remove(id, user.companyId, user.uid);
  }
}
```

### Règles pour les Controllers

1. ✅ **Toujours** utiliser `@ApiTags` et `@ApiOperation` (Swagger)
2. ✅ **Toujours** utiliser `@UseGuards(FirebaseAuthGuard)`
3. ✅ **Toujours** utiliser `@CurrentUser()` pour récupérer l'utilisateur
4. ✅ **Toujours** passer `companyId` et `userId` au service
5. ✅ **Toujours** utiliser `plainToClass` pour les response DTOs
6. ✅ Utiliser les bons status codes HTTP

---

## 6. MIGRATIONS

### Template de Migration

```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateStudentsTable1730000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'students',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'company_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'birth_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Foreign key vers companies
    await queryRunner.createForeignKey(
      'students',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Index pour performance
    await queryRunner.query(`
      CREATE INDEX idx_students_company_id ON students(company_id);
      CREATE INDEX idx_students_email ON students(email);
      CREATE INDEX idx_students_deleted_at ON students(deleted_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('students');
  }
}
```

### Règles pour les Migrations

1. ✅ **Toujours** ajouter `company_id` avec foreign key
2. ✅ **Toujours** ajouter `created_at`, `updated_at`, `deleted_at`
3. ✅ **Toujours** créer des index sur `company_id` et `deleted_at`
4. ✅ Utiliser `snake_case` pour les noms de colonnes
5. ✅ Utiliser `CASCADE` pour les foreign keys
6. ✅ Nommer les migrations avec timestamp: `1730000000006-CreateStudentsTable.ts`

---

## 7. MODULES SPÉCIAUX IMPLÉMENTÉS

### Module: user-preferences

**Emplacement:** `src/modules/user-preferences/`

**Responsabilité:** Gestion des préférences utilisateur (dark mode, configurations d'interfaces).

**Endpoints:**
- `GET /api/v1/user-preferences` - Récupérer les préférences
- `PUT /api/v1/user-preferences` - Mettre à jour les préférences globales
- `PATCH /api/v1/user-preferences/interface/:interfaceName` - Mettre à jour une interface

**Entity:** `user_interface_preferences`

**Colonnes clés:**
- `user_id` - UUID de l'utilisateur
- `is_dark_mode` - Boolean pour le mode sombre
- `interface_configs` - JSONB pour les configurations par interface

**Exemple de `interface_configs`:**
```json
{
  "dashboard": {
    "filters": { "period": "current-month" },
    "order": ["card-1", "card-2", "card-3"],
    "columns": ["name", "email", "status"]
  },
  "courses": {
    "filters": { "status": "active" },
    "order": ["card-total", "table-list"]
  }
}
```

---

### Module: interface-elements

**Emplacement:** `src/modules/interface-elements/`

**Responsabilité:** Gestion des éléments d'interface et permissions.

**Endpoints:**
- `GET /api/v1/interface-elements/:interfaceName` - Récupérer les éléments avec permissions

**Entities:**
1. `interface_elements` - Définition des éléments
2. `role_interface_elements` - Permissions par rôle

**Logique du Service:**
```typescript
async getInterfaceElements(interfaceName: string, userId: string): Promise<InterfaceElementResponseDto[]> {
  // 1. Récupérer tous les éléments de l'interface
  const elements = await this.elementsRepository.find({
    where: { interfaceName, companyId: user.companyId },
  });

  // 2. Récupérer les rôles de l'utilisateur
  const userRoles = await this.getUserRoles(userId);

  // 3. Récupérer les permissions (OR logic si plusieurs rôles)
  const permissions = await this.getRolePermissions(elements, userRoles);

  // 4. Récupérer les préférences utilisateur
  const userPrefs = await this.getUserPreferences(userId, interfaceName);

  // 5. Merger tout
  return elements.map(el => ({
    ...el,
    canView: permissions[el.id].canView,
    canEdit: permissions[el.id].canEdit,
    canCustomize: permissions[el.id].canCustomize,
    visible: userPrefs?.order?.includes(el.elementId) ?? el.defaultVisible,
    order: userPrefs?.order?.indexOf(el.elementId) ?? el.defaultOrder,
  }));
}
```

---

### Module: branding

**Emplacement:** `src/modules/branding/`

**Responsabilité:** Gestion de la charte graphique (logos, couleurs).

**Endpoints:**
- `GET /api/v1/branding/complete` - Récupérer le branding complet

**Entity:** `brandings`

**Colonnes clés:**
```typescript
// Logos
logo_url: string;              // Logo principal
logo_dark_url: string;         // Logo dark mode
logo_monochrome_url: string;   // Logo monochrome
logo_icon_url: string;         // Icône
favicon_url: string;           // Favicon

// Light Mode Colors
primary_color_light: string;         // #3b82f6
primary_color_hover_light: string;   // #2563eb
primary_color_active_light: string;  // #1d4ed8

secondary_color_light: string;       // #10b981
secondary_color_hover_light: string; // #059669
secondary_color_light_light: string; // #6ee7b7

accent_color_light: string;          // #f59e0b
accent_color_hover_light: string;    // #d97706
accent_color_light_light: string;    // #fbbf24

// Dark Mode Colors (même structure)
primary_color_dark: string;
// ... etc

// Custom
custom_css: string;    // CSS personnalisé
font_family: string;   // Police
font_url: string;      // URL Google Fonts
```

**Response:**
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "logos": {
    "main": "https://cdn.ednov.com/logos/main.png",
    "dark": "https://cdn.ednov.com/logos/dark.png",
    "monochrome": "https://cdn.ednov.com/logos/mono.png",
    "icon": "https://cdn.ednov.com/logos/icon.png",
    "favicon": "https://cdn.ednov.com/favicon.ico"
  },
  "lightTheme": {
    "primary": "#3b82f6",
    "primaryHover": "#2563eb",
    "primaryActive": "#1d4ed8",
    "secondary": "#10b981",
    "secondaryHover": "#059669",
    "secondaryLight": "#6ee7b7",
    "accent": "#f59e0b",
    "accentHover": "#d97706",
    "accentLight": "#fbbf24"
  },
  "darkTheme": { /* ... */ },
  "customCss": null,
  "fontFamily": null,
  "fontUrl": null
}
```

---

## 8. AUTHENTIFICATION

### Firebase JWT Guard

**Fichier:** `src/common/guards/firebase-auth.guard.ts`

**Utilisation:**
```typescript
@UseGuards(FirebaseAuthGuard)
@Controller('api/v1/students')
export class StudentsController {
  // Tous les endpoints sont protégés
}
```

### CurrentUser Decorator

**Fichier:** `src/common/decorators/current-user.decorator.ts`

**Utilisation:**
```typescript
@Get()
async findAll(@CurrentUser() user: UserPayload) {
  // user.uid - Firebase UID
  // user.email - Email
  // user.companyId - Company UUID
  return this.studentsService.findAll(user.companyId);
}
```

---

## 9. AUDIT TRAIL

### AuditService

**Utilisation:**
```typescript
await this.auditService.log({
  userId: user.uid,
  companyId: user.companyId,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: 'Student',
  entityId: student.id,
  changes: dto,
});
```

**Table:** `audit_logs`

**Colonnes:**
- `user_id` - Qui a fait l'action
- `company_id` - Dans quelle company
- `action` - Type d'action
- `entity_type` - Type d'entité
- `entity_id` - ID de l'entité
- `changes` - JSONB avec les changements
- `created_at` - Quand

---

## 10. MULTI-TENANCY

### Règle Absolue

**TOUJOURS** filtrer par `companyId` dans les queries.

```typescript
// ❌ NE JAMAIS FAIRE
const students = await this.studentsRepository.find();

// ✅ TOUJOURS FAIRE
const students = await this.studentsRepository.find({
  where: { companyId },
});
```

### Vérification de Sécurité

```typescript
// ✅ Vérifier que la ressource appartient à la company
async findOne(id: string, companyId: string): Promise<Student> {
  const student = await this.studentsRepository.findOne({
    where: { id, companyId }, // ← Important !
  });

  if (!student) {
    throw new NotFoundException('Student not found');
  }

  return student;
}
```

---

## 11. SOFT DELETE

### Règle

**TOUJOURS** utiliser soft delete, **JAMAIS** de suppression physique.

```typescript
// ❌ NE JAMAIS FAIRE
await this.studentsRepository.delete(id);

// ✅ TOUJOURS FAIRE
await this.studentsRepository.softDelete(id);
```

### Exclure les Supprimés

```typescript
// Les soft deleted sont automatiquement exclus
const students = await this.studentsRepository.find({
  where: { companyId },
});
// → Ne retourne que les étudiants non supprimés

// Pour inclure les supprimés (rare)
const allStudents = await this.studentsRepository.find({
  where: { companyId },
  withDeleted: true,
});
```

---

## 12. PERMISSIONS (Backend)

### Vérifier les Permissions

```typescript
import { ForbiddenException } from '@nestjs/common';

@Delete(':id')
async remove(
  @Param('id') id: string,
  @CurrentUser() user: UserPayload,
) {
  // Vérifier la permission
  const canDelete = await this.permissionsService.canDelete(user, 'students');
  
  if (!canDelete) {
    throw new ForbiddenException('No permission to delete students');
  }

  await this.studentsService.remove(id, user.companyId, user.uid);
}
```

---

## 13. SWAGGER DOCUMENTATION

### Décorateurs Obligatoires

```typescript
@ApiTags('Students')              // Tag pour grouper
@ApiBearerAuth()                  // Authentification requise
@ApiOperation({ summary: '...' }) // Description de l'endpoint
@ApiResponse({ status: 200, type: StudentResponseDto }) // Response
@ApiResponse({ status: 404, description: 'Not found' }) // Erreur
```

### Exemple Complet

```typescript
@ApiTags('Students')
@ApiBearerAuth()
@Controller('api/v1/students')
@UseGuards(FirebaseAuthGuard)
export class StudentsController {
  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, type: StudentResponseDto, description: 'Student found' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<StudentResponseDto> {
    return this.studentsService.findOne(id, user.companyId);
  }
}
```

---

## 14. CHECKLIST NOUVEAU MODULE

### Backend ✅

- [ ] Créer la structure de dossiers (dto, entities)
- [ ] Créer l'entity avec `company_id`, `created_at`, `updated_at`, `deleted_at`
- [ ] Créer les DTOs (Create, Update, Response)
- [ ] Créer le service avec audit logging
- [ ] Créer le controller avec Swagger
- [ ] Créer le module NestJS
- [ ] Importer le module dans `app.module.ts`
- [ ] Créer la migration
- [ ] Tester les endpoints

### Migration ✅

- [ ] Créer la table avec toutes les colonnes obligatoires
- [ ] Ajouter les foreign keys
- [ ] Créer les index (company_id, deleted_at)
- [ ] Tester `npm run migration:run`

---

## 15. EXEMPLE COMPLET : Module Courses

### 1. Entity

```typescript
// src/modules/courses/entities/course.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
```

### 2. DTOs

```typescript
// src/modules/courses/dto/create-course.dto.ts
export class CreateCourseDto {
  @ApiProperty({ example: 'Mathematics 101' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 'Introduction to algebra', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  teacherId: string;

  @ApiProperty({ example: 'active', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

// src/modules/courses/dto/update-course.dto.ts
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

// src/modules/courses/dto/course-response.dto.ts
export class CourseResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  teacherId: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @Exclude()
  companyId: string;

  @Exclude()
  deletedAt: Date;
}
```

### 3. Service

```typescript
// src/modules/courses/courses.service.ts
@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(companyId: string): Promise<Course[]> {
    return this.coursesRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id, companyId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async create(dto: CreateCourseDto, companyId: string, userId: string): Promise<Course> {
    const course = this.coursesRepository.create({
      ...dto,
      companyId,
    });

    const saved = await this.coursesRepository.save(course);

    await this.auditService.log({
      userId,
      companyId,
      action: 'CREATE',
      entityType: 'Course',
      entityId: saved.id,
      changes: dto,
    });

    return saved;
  }

  async update(id: string, dto: UpdateCourseDto, companyId: string, userId: string): Promise<Course> {
    const course = await this.findOne(id, companyId);

    Object.assign(course, dto);
    const updated = await this.coursesRepository.save(course);

    await this.auditService.log({
      userId,
      companyId,
      action: 'UPDATE',
      entityType: 'Course',
      entityId: id,
      changes: dto,
    });

    return updated;
  }

  async remove(id: string, companyId: string, userId: string): Promise<void> {
    await this.findOne(id, companyId);
    await this.coursesRepository.softDelete(id);

    await this.auditService.log({
      userId,
      companyId,
      action: 'DELETE',
      entityType: 'Course',
      entityId: id,
    });
  }
}
```

### 4. Controller

```typescript
// src/modules/courses/courses.controller.ts
@ApiTags('Courses')
@ApiBearerAuth()
@Controller('api/v1/courses')
@UseGuards(FirebaseAuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, type: [CourseResponseDto] })
  async findAll(@CurrentUser() user: UserPayload): Promise<CourseResponseDto[]> {
    const courses = await this.coursesService.findAll(user.companyId);
    return courses.map(c => plainToClass(CourseResponseDto, c));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, type: CourseResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: UserPayload,
  ): Promise<CourseResponseDto> {
    const course = await this.coursesService.create(dto, user.companyId, user.uid);
    return plainToClass(CourseResponseDto, course);
  }

  // ... autres endpoints
}
```

### 5. Module

```typescript
// src/modules/courses/courses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { Course } from './entities/course.entity';
import { AuditModule } from '@/modules/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course]),
    AuditModule,
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
```

### 6. Migration

```typescript
// migrations/1730000000007-CreateCoursesTable.ts
export class CreateCoursesTable1730000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'courses',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'company_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'teacher_id', type: 'uuid', isNullable: false },
          { name: 'status', type: 'varchar', length: '50', default: "'active'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'courses',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.query(`
      CREATE INDEX idx_courses_company_id ON courses(company_id);
      CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
      CREATE INDEX idx_courses_deleted_at ON courses(deleted_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('courses');
  }
}
```

### 7. Importer dans App Module

```typescript
// src/app.module.ts
import { CoursesModule } from './modules/courses/courses.module';

@Module({
  imports: [
    // ... autres modules
    CoursesModule,
  ],
})
export class AppModule {}
```

---

## 16. VARIABLES D'ENVIRONNEMENT

### Fichier: .env

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=ednov

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# App
PORT=3000
NODE_ENV=development
```

### Validation (config.validation.ts)

```typescript
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  FIREBASE_PROJECT_ID: Joi.string().required(),
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
});
```

---

## 17. COMMANDES UTILES

```bash
# Créer une migration
npm run migration:create -- migrations/CreateStudentsTable

# Exécuter les migrations
npm run migration:run

# Rollback
npm run migration:revert

# Build
npm run build

# Start dev
npm run start:dev

# Start prod
npm run start:prod

# Tests
npm run test
npm run test:e2e
```

---

## 18. ERREURS COURANTES

### ❌ Erreur 1 : Oublier companyId

```typescript
// ❌ MAUVAIS
const students = await this.studentsRepository.find();

// ✅ BON
const students = await this.studentsRepository.find({
  where: { companyId },
});
```

### ❌ Erreur 2 : Delete au lieu de SoftDelete

```typescript
// ❌ MAUVAIS
await this.studentsRepository.delete(id);

// ✅ BON
await this.studentsRepository.softDelete(id);
```

### ❌ Erreur 3 : Pas d'Audit Log

```typescript
// ❌ MAUVAIS
async create(dto: CreateStudentDto, companyId: string) {
  return this.studentsRepository.save({ ...dto, companyId });
}

// ✅ BON
async create(dto: CreateStudentDto, companyId: string, userId: string) {
  const saved = await this.studentsRepository.save({ ...dto, companyId });
  
  await this.auditService.log({
    userId,
    companyId,
    action: 'CREATE',
    entityType: 'Student',
    entityId: saved.id,
    changes: dto,
  });
  
  return saved;
}
```

---

**Ce document est LA RÉFÉRENCE pour le développement backend EdNov.**

**À lire AVANT de créer un nouveau module ! 🎯**
