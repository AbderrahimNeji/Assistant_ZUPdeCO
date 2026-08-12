# Schéma de Base de Données - EdNov Backend

## 🗄️ Vue d'Ensemble

Cette page documente **TOUTES** les tables de la base de données PostgreSQL.

## 🎯 Principes Architecturaux

### 1. Multi-Tenancy

**Toutes les tables** (sauf `companies`) contiennent une colonne `company_id`.

```sql
company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
```

### 2. Soft Delete

**Toutes les tables** contiennent une colonne `deleted_at`.

```sql
deleted_at TIMESTAMPTZ NULL
```

### 3. Audit Trail

**Toutes les tables** contiennent `created_at` et `updated_at`.

```sql
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 📊 TABLES PRINCIPALES

### 1. brandings

**Description:** Charte graphique de l'application (logos + couleurs).

**Migration:** `1730000000004-ExtendBrandingsTable.ts`

**Colonnes:**
```sql
CREATE TABLE brandings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Logos
  logo_url VARCHAR(500),              -- Logo principal (light mode)
  logo_dark_url VARCHAR(500),         -- Logo dark mode
  logo_monochrome_url VARCHAR(500),   -- Logo monochrome
  logo_icon_url VARCHAR(500),         -- Icône seule
  favicon_url VARCHAR(500),           -- Favicon
  
  -- Light Mode Colors
  primary_color VARCHAR(20),          -- #3b82f6
  primary_color_hover VARCHAR(20),    -- #2563eb
  primary_color_active VARCHAR(20),   -- #1d4ed8
  
  secondary_color VARCHAR(20),        -- #10b981
  secondary_color_hover VARCHAR(20),  -- #059669
  secondary_color_light VARCHAR(20),  -- #6ee7b7
  
  accent_color VARCHAR(20),           -- #f59e0b
  accent_color_hover VARCHAR(20),     -- #d97706
  accent_color_light VARCHAR(20),     -- #fbbf24
  
  -- Dark Mode Colors (même structure)
  primary_color_dark VARCHAR(20),
  primary_color_hover_dark VARCHAR(20),
  primary_color_active_dark VARCHAR(20),
  
  secondary_color_dark VARCHAR(20),
  secondary_color_hover_dark VARCHAR(20),
  secondary_color_light_dark VARCHAR(20),
  
  accent_color_dark VARCHAR(20),
  accent_color_hover_dark VARCHAR(20),
  accent_color_light_dark VARCHAR(20),
  
  -- Custom
  custom_css TEXT,
  font_family VARCHAR(100),
  font_url VARCHAR(500),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_brandings_company_id ON brandings(company_id);
```

**Exemple de données:**
```sql
INSERT INTO brandings (company_id, logo_url, primary_color, primary_color_hover, primary_color_active)
VALUES (
  'company-uuid',
  'https://cdn.ednov.com/logos/main.png',
  '#3b82f6',
  '#2563eb',
  '#1d4ed8'
);
```

---

### 2. user_interface_preferences

**Description:** Préférences utilisateur (dark mode + configurations d'interfaces).

**Migration:** `1730000000003-AddUserInterfacePreferences.ts`

**Colonnes:**
```sql
CREATE TABLE user_interface_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_dark_mode BOOLEAN DEFAULT false,
  interface_configs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_interface_preferences_user_id UNIQUE(user_id)
);

CREATE INDEX idx_uip_user_id ON user_interface_preferences(user_id);
CREATE INDEX idx_uip_company_id ON user_interface_preferences(company_id);
```

**Exemple de `interface_configs`:**
```json
{
  "dashboard": {
    "filters": { "period": "current-month" },
    "order": ["card-1", "card-2", "card-3"],
    "columns": ["name", "email", "status"]
  },
  "courses": {
    "filters": { "status": "active", "teacher": "teacher-uuid" },
    "order": ["card-total", "table-list"]
  }
}
```

**Exemple de données:**
```sql
INSERT INTO user_interface_preferences (user_id, company_id, is_dark_mode, interface_configs)
VALUES (
  'user-uuid',
  'company-uuid',
  true,
  '{"dashboard": {"filters": {"period": "current-month"}}}'::jsonb
);
```

---

### 3. interface_elements

**Description:** Définition des éléments UI disponibles pour chaque interface.

**Migration:** `1730000000005-AddInterfaceElements.ts`

**Colonnes:**
```sql
CREATE TABLE interface_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  interface_name VARCHAR(100) NOT NULL,   -- 'dashboard', 'courses', etc.
  element_id VARCHAR(100) NOT NULL,       -- 'card-total-students'
  element_type VARCHAR(50) NOT NULL,      -- 'stat_card', 'table', 'chart'
  element_label VARCHAR(255) NOT NULL,    -- 'Total Students'
  default_visible BOOLEAN DEFAULT true,
  default_order INT DEFAULT 0,
  default_width VARCHAR(20) DEFAULT 'auto', -- '1/3', '1/2', 'full'
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_interface_elements_company_interface_element 
    UNIQUE(company_id, interface_name, element_id)
);

CREATE INDEX idx_interface_elements_company_id ON interface_elements(company_id);
CREATE INDEX idx_interface_elements_interface_name ON interface_elements(interface_name);
CREATE INDEX idx_interface_elements_element_type ON interface_elements(element_type);
```

**Types d'éléments:**
- `stat_card` - Card de statistique
- `table` - Tableau de données
- `chart` - Graphique
- `widget` - Widget personnalisé
- `list` - Liste
- `form` - Formulaire
- `custom` - Élément custom

**Widths disponibles:**
- `1/4` - 25%
- `1/3` - 33%
- `1/2` - 50%
- `2/3` - 66%
- `3/4` - 75%
- `full` - 100%
- `auto` - Automatique

**Exemple de données:**
```sql
INSERT INTO interface_elements (
  company_id, interface_name, element_id, element_type,
  element_label, default_visible, default_order, default_width, config
) VALUES
  (
    'company-uuid',
    'dashboard',
    'card-total-students',
    'stat_card',
    'Total Students',
    true,
    0,
    '1/3',
    '{"value": 245, "iconColor": "text-primary", "iconBgColor": "bg-primary/10"}'::jsonb
  ),
  (
    'company-uuid',
    'dashboard',
    'table-sessions',
    'table',
    'Sessions List',
    true,
    1,
    'full',
    '{"columns": ["name", "date", "teacher", "status"]}'::jsonb
  );
```

---

### 4. role_interface_elements

**Description:** Permissions des rôles sur les éléments d'interface.

**Migration:** `1730000000005-AddInterfaceElements.ts`

**Colonnes:**
```sql
CREATE TABLE role_interface_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  element_id UUID NOT NULL REFERENCES interface_elements(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_customize BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_role_interface_elements UNIQUE(role_id, element_id)
);

CREATE INDEX idx_role_interface_elements_company_id ON role_interface_elements(company_id);
CREATE INDEX idx_role_interface_elements_role_id ON role_interface_elements(role_id);
CREATE INDEX idx_role_interface_elements_element_id ON role_interface_elements(element_id);
```

**Permissions:**
- `can_view` - L'utilisateur peut voir l'élément
- `can_edit` - L'utilisateur peut interagir/modifier les données
- `can_customize` - L'utilisateur peut cacher/réordonner l'élément

**Exemple de données:**
```sql
-- STUDENT : Voir seulement certaines cards
INSERT INTO role_interface_elements (company_id, role_id, element_id, can_view, can_edit, can_customize)
SELECT 
  'company-uuid',
  (SELECT id FROM roles WHERE code = 'STUDENT'),
  ie.id,
  CASE 
    WHEN ie.element_id IN ('card-my-grades', 'table-my-sessions') THEN true
    ELSE false
  END,
  false,
  true
FROM interface_elements ie
WHERE ie.interface_name = 'dashboard';

-- TEACHER : Voir plus d'éléments
INSERT INTO role_interface_elements (company_id, role_id, element_id, can_view, can_edit, can_customize)
SELECT 
  'company-uuid',
  (SELECT id FROM roles WHERE code = 'TEACHER'),
  ie.id,
  true,
  CASE 
    WHEN ie.element_type = 'table' THEN true
    ELSE false
  END,
  true
FROM interface_elements ie
WHERE ie.interface_name = 'dashboard';

-- ADMIN : Tout voir et tout éditer
INSERT INTO role_interface_elements (company_id, role_id, element_id, can_view, can_edit, can_customize)
SELECT 
  'company-uuid',
  (SELECT id FROM roles WHERE code = 'ADMIN'),
  ie.id,
  true,
  true,
  true
FROM interface_elements ie
WHERE ie.interface_name = 'dashboard';
```

---

## 🔄 RELATIONS ENTRE TABLES

### Diagramme

```
companies
    │
    ├─── brandings (1:1)
    │
    ├─── users (1:N)
    │       │
    │       └─── user_interface_preferences (1:1)
    │
    ├─── roles (1:N)
    │       │
    │       └─── user_roles (N:N avec users)
    │
    └─── interface_elements (1:N)
            │
            └─── role_interface_elements (N:N avec roles)
```

### Requêtes de Jointure

#### Récupérer les Éléments avec Permissions

```sql
SELECT 
  ie.id,
  ie.interface_name,
  ie.element_id,
  ie.element_type,
  ie.element_label,
  ie.default_width,
  ie.default_order,
  ie.config,
  BOOL_OR(rie.can_view) as can_view,
  BOOL_OR(rie.can_edit) as can_edit,
  BOOL_OR(rie.can_customize) as can_customize
FROM interface_elements ie
LEFT JOIN role_interface_elements rie ON rie.element_id = ie.id
LEFT JOIN user_roles ur ON ur.role_id = rie.role_id
WHERE ie.interface_name = 'dashboard'
  AND ie.company_id = 'company-uuid'
  AND ur.user_id = 'user-uuid'
GROUP BY ie.id;
```

#### Récupérer les Préférences Utilisateur

```sql
SELECT 
  uip.is_dark_mode,
  uip.interface_configs
FROM user_interface_preferences uip
WHERE uip.user_id = 'user-uuid';
```

---

## 🔧 MIGRATIONS

### Commandes

```bash
# Créer une migration
npm run migration:create -- migrations/CreateStudentsTable

# Exécuter les migrations
npm run migration:run

# Rollback
npm run migration:revert

# Afficher les migrations
npm run migration:show
```

### Template de Migration

```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateStudentsTable1730000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Créer la table
    await queryRunner.createTable(
      new Table({
        name: 'students',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
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
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 2. Créer les foreign keys
    await queryRunner.createForeignKey(
      'students',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 3. Créer les index
    await queryRunner.query(`
      CREATE INDEX idx_students_company_id ON students(company_id);
      CREATE INDEX idx_students_email ON students(email);
      CREATE INDEX idx_students_deleted_at ON students(deleted_at);
    `);

    // 4. Ajouter des commentaires
    await queryRunner.query(`
      COMMENT ON TABLE students IS 'Student records for the EdNov platform';
      COMMENT ON COLUMN students.company_id IS 'Multi-tenancy: company this student belongs to';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('students');
  }
}
```

---

## 📋 TABLES POUR LE SYSTÈME DE LAYOUT DYNAMIQUE

### interface_elements

**Objectif:** Définir les éléments UI disponibles pour chaque interface.

**Colonnes Clés:**
- `interface_name` - Nom de l'interface ('dashboard', 'courses')
- `element_id` - ID unique de l'élément ('card-total-students')
- `element_type` - Type d'élément ('stat_card', 'table', 'chart')
- `element_label` - Label affiché ('Total Students')
- `default_visible` - Visible par défaut (true/false)
- `default_order` - Ordre par défaut (0, 1, 2, ...)
- `default_width` - Largeur par défaut ('1/3', 'full')
- `config` - Configuration JSONB (icônes, couleurs, données)

**Exemple:**
```sql
INSERT INTO interface_elements (
  company_id, interface_name, element_id, element_type,
  element_label, default_visible, default_order, default_width, config
) VALUES (
  'company-uuid',
  'dashboard',
  'card-total-students',
  'stat_card',
  'Total Students',
  true,
  0,
  '1/3',
  '{"value": 245, "iconColor": "text-primary"}'::jsonb
);
```

### role_interface_elements

**Objectif:** Définir les permissions des rôles sur les éléments.

**Colonnes Clés:**
- `role_id` - ID du rôle
- `element_id` - ID de l'élément
- `can_view` - Peut voir l'élément
- `can_edit` - Peut éditer/interagir
- `can_customize` - Peut cacher/réordonner

**Logique OR:** Si un utilisateur a plusieurs rôles, les permissions sont cumulatives.

**Exemple:**
```sql
-- STUDENT peut voir card-my-grades
INSERT INTO role_interface_elements (company_id, role_id, element_id, can_view, can_edit, can_customize)
VALUES (
  'company-uuid',
  (SELECT id FROM roles WHERE code = 'STUDENT'),
  (SELECT id FROM interface_elements WHERE element_id = 'card-my-grades'),
  true,
  false,
  true
);

-- ADMIN peut tout voir et tout éditer
INSERT INTO role_interface_elements (company_id, role_id, element_id, can_view, can_edit, can_customize)
SELECT 'company-uuid', r.id, ie.id, true, true, true
FROM roles r
CROSS JOIN interface_elements ie
WHERE r.code = 'ADMIN';
```

---

## 🎯 REQUÊTES UTILES

### Récupérer les Éléments pour un Utilisateur

```sql
SELECT 
  ie.id,
  ie.interface_name,
  ie.element_id,
  ie.element_type,
  ie.element_label,
  ie.default_width,
  ie.default_order,
  ie.config,
  BOOL_OR(rie.can_view) as can_view,
  BOOL_OR(rie.can_edit) as can_edit,
  BOOL_OR(rie.can_customize) as can_customize,
  uip.interface_configs->'dashboard'->'order' as user_order
FROM interface_elements ie
LEFT JOIN role_interface_elements rie ON rie.element_id = ie.id
LEFT JOIN user_roles ur ON ur.role_id = rie.role_id
LEFT JOIN user_interface_preferences uip ON uip.user_id = ur.user_id
WHERE ie.interface_name = 'dashboard'
  AND ie.company_id = 'company-uuid'
  AND ur.user_id = 'user-uuid'
  AND ie.deleted_at IS NULL
GROUP BY ie.id, uip.interface_configs;
```

### Vérifier les Permissions d'un Utilisateur

```sql
SELECT 
  ie.element_id,
  BOOL_OR(rie.can_view) as can_view,
  BOOL_OR(rie.can_edit) as can_edit
FROM interface_elements ie
LEFT JOIN role_interface_elements rie ON rie.element_id = ie.id
LEFT JOIN user_roles ur ON ur.role_id = rie.role_id
WHERE ie.interface_name = 'dashboard'
  AND ur.user_id = 'user-uuid'
GROUP BY ie.element_id;
```

### Mettre à Jour les Préférences

```sql
-- Créer ou mettre à jour
INSERT INTO user_interface_preferences (user_id, company_id, is_dark_mode, interface_configs)
VALUES (
  'user-uuid',
  'company-uuid',
  true,
  '{"dashboard": {"order": ["card-1", "card-2"]}}'::jsonb
)
ON CONFLICT (user_id)
DO UPDATE SET
  is_dark_mode = EXCLUDED.is_dark_mode,
  interface_configs = EXCLUDED.interface_configs,
  updated_at = NOW();
```

---

## 🔍 INDEX ET PERFORMANCE

### Index Obligatoires

**Pour chaque table:**
```sql
CREATE INDEX idx_[table]_company_id ON [table](company_id);
CREATE INDEX idx_[table]_deleted_at ON [table](deleted_at);
```

**Pour les tables avec relations:**
```sql
CREATE INDEX idx_[table]_[foreign_key] ON [table]([foreign_key]);
```

**Exemples:**
```sql
CREATE INDEX idx_students_company_id ON students(company_id);
CREATE INDEX idx_students_deleted_at ON students(deleted_at);
CREATE INDEX idx_role_interface_elements_role_id ON role_interface_elements(role_id);
CREATE INDEX idx_role_interface_elements_element_id ON role_interface_elements(element_id);
```

---

## 🎨 JSONB COLUMNS

### interface_configs (user_interface_preferences)

**Structure:**
```json
{
  "[interface_name]": {
    "filters": { /* Filtres sauvegardés */ },
    "order": [ /* Ordre des éléments */ ],
    "columns": [ /* Colonnes visibles */ ],
    "layout": "grid" | "list" | "compact",
    /* Autres configs spécifiques */
  }
}
```

**Exemples:**
```json
{
  "dashboard": {
    "filters": {
      "period": "current-month",
      "status": "active"
    },
    "order": ["card-1", "card-2", "card-3"],
    "layout": "grid"
  },
  "courses": {
    "filters": {
      "teacher": "teacher-uuid",
      "status": "active"
    },
    "columns": ["name", "teacher", "students", "status"]
  }
}
```

### config (interface_elements)

**Structure selon le type:**

**stat_card:**
```json
{
  "value": 245,
  "iconColor": "text-primary",
  "iconBgColor": "bg-primary/10",
  "description": "Active students",
  "trend": { "value": 12, "isPositive": true }
}
```

**table:**
```json
{
  "columns": ["name", "email", "status"],
  "defaultSort": { "field": "name", "order": "asc" },
  "pageSize": 20
}
```

**chart:**
```json
{
  "chartType": "line",
  "dataSource": "/api/v1/stats/students",
  "xAxis": "date",
  "yAxis": "count",
  "color": "primary"
}
```

---

## 🚀 SEED DATA

### Script de Seed pour Dashboard

**Fichier:** `src/modules/interface-elements/seeds/seed-dashboard-elements.ts`

```typescript
import { DataSource } from 'typeorm';

export async function seedDashboardElements(dataSource: DataSource) {
  const companyId = 'your-company-uuid';

  // 1. Récupérer les rôles
  const rolesRepo = dataSource.getRepository('roles');
  const studentRole = await rolesRepo.findOne({ where: { code: 'STUDENT' } });
  const teacherRole = await rolesRepo.findOne({ where: { code: 'TEACHER' } });
  const adminRole = await rolesRepo.findOne({ where: { code: 'ADMIN' } });

  // 2. Créer les éléments
  const elementsRepo = dataSource.getRepository('interface_elements');

  const elements = await elementsRepo.save([
    {
      companyId,
      interfaceName: 'dashboard',
      elementId: 'card-total-students',
      elementType: 'stat_card',
      elementLabel: 'Total Students',
      defaultVisible: true,
      defaultOrder: 0,
      defaultWidth: '1/3',
      config: {
        value: 245,
        iconColor: 'text-primary',
        iconBgColor: 'bg-primary/10',
      },
    },
    {
      companyId,
      interfaceName: 'dashboard',
      elementId: 'card-active-courses',
      elementType: 'stat_card',
      elementLabel: 'Active Courses',
      defaultVisible: true,
      defaultOrder: 1,
      defaultWidth: '1/3',
      config: {
        value: 12,
        iconColor: 'text-secondary',
        iconBgColor: 'bg-secondary/10',
      },
    },
    {
      companyId,
      interfaceName: 'dashboard',
      elementId: 'table-sessions',
      elementType: 'table',
      elementLabel: 'Sessions',
      defaultVisible: true,
      defaultOrder: 2,
      defaultWidth: 'full',
      config: {
        columns: ['name', 'date', 'teacher', 'status'],
      },
    },
  ]);

  // 3. Créer les permissions
  const permissionsRepo = dataSource.getRepository('role_interface_elements');

  const permissions = [];

  // STUDENT : Voir seulement card-active-courses et table-sessions
  permissions.push(
    {
      companyId,
      roleId: studentRole.id,
      elementId: elements[1].id, // card-active-courses
      canView: true,
      canEdit: false,
      canCustomize: true,
    },
    {
      companyId,
      roleId: studentRole.id,
      elementId: elements[2].id, // table-sessions
      canView: true,
      canEdit: false,
      canCustomize: true,
    },
  );

  // TEACHER : Voir tous les éléments
  elements.forEach(el => {
    permissions.push({
      companyId,
      roleId: teacherRole.id,
      elementId: el.id,
      canView: true,
      canEdit: el.elementType === 'table',
      canCustomize: true,
    });
  });

  // ADMIN : Tout
  elements.forEach(el => {
    permissions.push({
      companyId,
      roleId: adminRole.id,
      elementId: el.id,
      canView: true,
      canEdit: true,
      canCustomize: true,
    });
  });

  await permissionsRepo.save(permissions);

  console.log('✅ Dashboard elements seeded');
}
```

**Exécuter:**
```bash
npm run seed:dashboard
```

---

## 📊 SCHÉMA COMPLET

### Tables Principales (EdNov System)

1. ✅ `companies` - Entreprises (multi-tenancy)
2. ✅ `users` - Utilisateurs
3. ✅ `roles` - Rôles (ADMIN, TEACHER, STUDENT)
4. ✅ `user_roles` - Association users ↔ roles (N:N)
5. ✅ `brandings` - Charte graphique
6. ✅ `user_interface_preferences` - Préférences utilisateur
7. ✅ `interface_elements` - Éléments UI
8. ✅ `role_interface_elements` - Permissions rôles ↔ éléments
9. ✅ `audit_logs` - Logs d'audit
10. ✅ `outbox_events` - Event sourcing

### Colonnes Obligatoires

**Pour toute nouvelle table:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
deleted_at TIMESTAMPTZ NULL
```

**Index obligatoires:**
```sql
CREATE INDEX idx_[table]_company_id ON [table](company_id);
CREATE INDEX idx_[table]_deleted_at ON [table](deleted_at);
```

---

## 🔐 SÉCURITÉ

### Row Level Security (RLS)

**Règle:** Toujours filtrer par `company_id` dans les queries.

```typescript
// ✅ BON
const students = await this.studentsRepository.find({
  where: { companyId: user.companyId },
});

// ❌ MAUVAIS
const students = await this.studentsRepository.find();
```

### Soft Delete

**Règle:** Toujours utiliser `softDelete()`.

```typescript
// ✅ BON
await this.studentsRepository.softDelete(id);

// ❌ MAUVAIS
await this.studentsRepository.delete(id);
```

---

## 📚 RESSOURCES

### Fichiers de Migration

1. `1730000000003-AddUserInterfacePreferences.ts` - Table user_interface_preferences
2. `1730000000004-ExtendBrandingsTable.ts` - Extension table brandings
3. `1730000000005-AddInterfaceElements.ts` - Tables interface_elements + role_interface_elements

### Scripts de Seed

1. `src/modules/interface-elements/seeds/seed-dashboard-elements.ts` - Seed dashboard

### Documentation TypeORM

- [TypeORM Migrations](https://typeorm.io/migrations)
- [TypeORM Entities](https://typeorm.io/entities)

---

**Ce document est LA RÉFÉRENCE pour le schéma de base de données.**

**À consulter AVANT de créer une nouvelle table ! 🗄️**
