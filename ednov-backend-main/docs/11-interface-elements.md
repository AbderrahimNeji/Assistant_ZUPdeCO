# Interface Elements Module - EdNov Backend

## Vue d'Ensemble

Le module `interface-elements` permet de définir dynamiquement les éléments d'interface (cards, tables, charts) disponibles pour chaque rôle utilisateur.

## Architecture

```
┌─────────────────────────────────────┐
│     interface_elements (table)      │
│  Définit les éléments disponibles   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  role_interface_elements (table)    │
│  Associe éléments aux rôles         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  InterfaceElementsService           │
│  Fusionne rôles + préférences       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  GET /interface-elements/:name      │
│  Retourne éléments filtrés          │
└─────────────────────────────────────┘
```

## Tables

### 1. `interface_elements`

**Définit les éléments UI disponibles.**

```sql
CREATE TABLE interface_elements (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  interface_name VARCHAR(100),      -- 'dashboard', 'sessions', etc.
  element_id VARCHAR(100),           -- 'card-students', 'table-sessions'
  element_type VARCHAR(50),          -- 'stat_card', 'table', 'chart'
  element_label VARCHAR(255),        -- Label affiché
  default_visible BOOLEAN,           -- Visible par défaut
  default_order INT,                 -- Ordre d'affichage
  default_width VARCHAR(20),         -- '1/3', '1/2', '2/3', 'full'
  config JSONB,                      -- Configuration (icônes, couleurs)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

**Colonnes clés:**
- `interface_name`: Identifiant de l'interface (dashboard, sessions, etc.)
- `element_id`: ID unique de l'élément dans l'interface
- `element_type`: Type d'élément (stat_card, table, chart, widget, list, form, custom)
- `default_width`: Largeur par défaut (1/3, 1/2, 2/3, full, auto)
- `config`: Configuration JSON (valeurs, icônes, couleurs, etc.)

### 2. `role_interface_elements`

**Associe les éléments aux rôles avec permissions.**

```sql
CREATE TABLE role_interface_elements (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  role_id UUID REFERENCES roles(id),
  element_id UUID REFERENCES interface_elements(id),
  can_view BOOLEAN,                  -- Peut voir
  can_edit BOOLEAN,                  -- Peut éditer les données
  can_customize BOOLEAN,             -- Peut cacher/réorganiser
  visibility_scope JSONB,            -- Nullable : périmètre de données (voir ci-dessous)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Permissions:**
- `can_view`: L'utilisateur peut voir cet élément
- `can_edit`: L'utilisateur peut interagir avec les données
- `can_customize`: L'utilisateur peut cacher/réorganiser l'élément

**`visibility_scope` (JSONB, optionnel)** — précise, pour certains éléments, comment filtrer les données affichées (ex. liste des administrateurs). Champs typiques : `targetRoleCode`, `operator` (`AND` | `OR`), `relations` (documentation).

Valeurs possibles pour `scope` :

- `unrestricted` — pas de filtre supplémentaire pour ce lien rôle/élément
- `same_establishment` — limiter aux utilisateurs des mêmes établissements que l’acteur
- `managed_by` — limiter aux utilisateurs dont `managed_by` = acteur
- `same_establishment_or_managed_by` — combinaison selon `operator` (souvent `OR`)
- `assignment` — limiter aux utilisateurs liés par missions / affectations (à appliquer dans l’API qui consomme ce scope)

## Entities

### InterfaceElement

**Fichier:** `src/modules/interface-elements/entities/interface-element.entity.ts`

```typescript
@Entity({ name: 'interface_elements' })
export class InterfaceElement extends BaseEntity {
  @Column() companyId: string;
  @Column() interfaceName: string;
  @Column() elementId: string;
  @Column() elementType: ElementType;
  @Column() elementLabel: string;
  @Column() defaultVisible: boolean;
  @Column() defaultOrder: number;
  @Column() defaultWidth: ElementWidth;
  @Column({ type: 'jsonb' }) config: Record<string, unknown>;
}
```

**Types:**
```typescript
type ElementType = 'stat_card' | 'table' | 'chart' | 'widget' | 'list' | 'form' | 'custom';
type ElementWidth = '1/3' | '1/2' | '2/3' | 'full' | 'auto';
```

### RoleInterfaceElement

**Fichier:** `src/modules/interface-elements/entities/role-interface-element.entity.ts`

```typescript
@Entity({ name: 'role_interface_elements' })
export class RoleInterfaceElement extends BaseEntity {
  @Column() companyId: string;
  @Column() roleId: string;
  @Column() elementId: string;
  @Column() canView: boolean;
  @Column() canEdit: boolean;
  @Column() canCustomize: boolean;
  @Column({ type: 'jsonb', nullable: true }) visibilityScope: {
    scope:
      | 'unrestricted'
      | 'same_establishment'
      | 'managed_by'
      | 'same_establishment_or_managed_by'
      | 'assignment';
    relations?: string[];
    targetRoleCode?: string;
    operator?: 'AND' | 'OR';
  } | null;
}
```

## Service

### InterfaceElementsService

**Fichier:** `src/modules/interface-elements/interface-elements.service.ts`

**Méthode principale:**

```typescript
async getInterfaceElements(
  interfaceName: string,
  companyId: string,
  roleIds: string[],
  userPreferences?: Record<string, unknown>
): Promise<InterfaceElementResponseDto[]>
```

**Logique:**
1. Récupère tous les éléments de l'interface pour la company
2. Récupère les permissions des rôles de l'utilisateur
3. Fusionne les permissions (OR logic: si un rôle donne accès, l'user a accès)
4. Applique les préférences utilisateur (ordre, visibilité)
5. Filtre les éléments non autorisés
6. Trie par ordre personnalisé ou par défaut
7. Retourne la liste filtrée et triée

**Exemple de fusion:**
```typescript
// User a 2 rôles: TEACHER + ADMIN
// TEACHER: can_view=true, can_edit=false
// ADMIN: can_view=true, can_edit=true
// Résultat: can_view=true, can_edit=true (OR logic)
```

## Controller

### InterfaceElementsController

**Fichier:** `src/modules/interface-elements/interface-elements.controller.ts`

**Endpoint:**

```typescript
@Get(':interfaceName')
async getInterfaceElements(
  @Param('interfaceName') interfaceName: string,
  @CurrentUser() user: UserPayload
): Promise<InterfaceElementResponseDto[]>
```

**Route:** `GET /api/v1/interface-elements/:interfaceName`

**Authentification:** Firebase JWT (obligatoire)

**Paramètres:**
- `interfaceName`: Nom de l'interface (dashboard, sessions, etc.)

**Réponse:**
```json
[
  {
    "id": "uuid",
    "interfaceName": "dashboard",
    "elementId": "card-students",
    "elementType": "stat_card",
    "elementLabel": "Total Students",
    "defaultVisible": true,
    "defaultOrder": 0,
    "defaultWidth": "1/3",
    "config": {
      "value": 245,
      "iconColor": "text-primary",
      "iconBgColor": "bg-primary/10",
      "trend": { "value": 12, "isPositive": true }
    },
    "canView": true,
    "canEdit": false,
    "canCustomize": true,
    "userVisible": true,
    "userOrder": 0
  }
]
```

## DTOs

### InterfaceElementResponseDto

**Fichier:** `src/modules/interface-elements/dto/interface-element-response.dto.ts`

```typescript
export class InterfaceElementResponseDto {
  id: string;
  interfaceName: string;
  elementId: string;
  elementType: ElementType;
  elementLabel: string;
  defaultVisible: boolean;
  defaultOrder: number;
  defaultWidth: ElementWidth;
  config: Record<string, unknown>;
  canView: boolean;           // Permission du rôle
  canEdit: boolean;           // Permission du rôle
  canCustomize: boolean;      // Permission du rôle
  userVisible?: boolean;      // Préférence utilisateur
  userOrder?: number;         // Préférence utilisateur
}
```

## Migration

**Fichier:** `migrations/1730000000005-AddInterfaceElements.ts`

**Tables créées:**
1. `interface_elements`
2. `role_interface_elements`

**Indexes:**
- `idx_interface_elements_company_id`
- `idx_interface_elements_interface_name`
- `idx_interface_elements_element_type`
- `idx_role_interface_elements_role_id`
- `idx_role_interface_elements_element_id`

**Contraintes:**
- `uq_interface_elements_company_interface_element` (unique)
- `uq_role_interface_elements` (unique)

## Seed Script

**Fichier:** `src/modules/interface-elements/seeds/seed-dashboard-elements.ts`

**Données créées:**
- 14 éléments dashboard (9 cards + 3 tables + 2 charts)
- 24 permissions pour 3 rôles (STUDENT, TEACHER, ADMIN)

**Exécution:**
```bash
npm run seed:dashboard-elements
```

**Résultat:**
- STUDENT: 4 éléments (3 cards + 1 table)
- TEACHER: 8 éléments (6 cards + 2 tables)
- ADMIN: 14 éléments (tous)

## Utilisation

### Créer un Élément

```sql
INSERT INTO interface_elements (
  company_id, interface_name, element_id, element_type,
  element_label, default_visible, default_order, default_width, config
) VALUES (
  'company-uuid',
  'dashboard',
  'card-new-metric',
  'stat_card',
  'New Metric',
  true,
  10,
  '1/3',
  '{"value": 100, "iconColor": "text-primary"}'::jsonb
);
```

### Associer à un Rôle

```sql
INSERT INTO role_interface_elements (
  company_id, role_id, element_id, can_view, can_edit, can_customize
) VALUES (
  'company-uuid',
  'admin-role-uuid',
  'element-uuid',
  true,
  true,
  true
);
```

### Appeler l'API

```bash
curl http://localhost:3000/api/v1/interface-elements/dashboard \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

## Exemples de Configuration

### Stat Card

```json
{
  "element_type": "stat_card",
  "config": {
    "value": 245,
    "iconColor": "text-primary",
    "iconBgColor": "bg-primary/10",
    "trend": { "value": 12, "isPositive": true },
    "description": "Active students this month"
  }
}
```

### Table

```json
{
  "element_type": "table",
  "config": {
    "columns": ["date", "course", "teacher", "students", "status"],
    "pageSize": 10,
    "sortable": true,
    "filterable": true
  }
}
```

### Chart

```json
{
  "element_type": "chart",
  "config": {
    "chartType": "line",
    "period": "last_6_months",
    "dataSource": "/api/v1/analytics/enrollment"
  }
}
```

## Permissions

### Logique de Fusion

```typescript
// User avec 2 rôles
roleElements = [
  { roleId: 'role1', canView: true, canEdit: false },
  { roleId: 'role2', canView: true, canEdit: true }
];

// Résultat (OR logic)
result = {
  canView: true,   // true OR true = true
  canEdit: true    // false OR true = true
};
```

### Filtrage

```typescript
// Seuls les éléments avec canView=true sont retournés
elements.filter(el => el.canView === true);
```

## Préférences Utilisateur

### Structure

```json
{
  "dashboard": {
    "elements": [
      { "id": "card-students", "visible": true, "order": 0 },
      { "id": "card-sessions", "visible": false, "order": 1 },
      { "id": "table-sessions", "visible": true, "order": 2 }
    ]
  }
}
```

### Application

```typescript
// Si userVisible est défini, il override defaultVisible
const visible = element.userVisible ?? element.defaultVisible;

// Si userOrder est défini, il override defaultOrder
const order = element.userOrder ?? element.defaultOrder;
```

## Avantages

✅ **Flexibilité**
- Ajout d'éléments sans code
- Configuration en base de données
- Types d'éléments extensibles

✅ **Sécurité**
- Permissions granulaires
- Filtrage côté serveur
- Multi-tenancy

✅ **Performance**
- Requêtes optimisées
- Indexes appropriés
- Cache possible

✅ **Maintenabilité**
- Code découplé
- Logique centralisée
- Facile à étendre

## Limitations

- Pas de validation du config JSONB
- Pas de versioning des éléments
- Pas de preview des changements

## Évolutions Futures

1. Validation du config avec JSON Schema
2. Versioning des éléments
3. Preview mode pour admin
4. Templates d'éléments
5. Import/Export de configurations

---

**Voir aussi:**
- [User Preferences Module](./10-user-preferences.md)
- [Branding Module](./09-branding.md)
- [Frontend: Dynamic Layout](../../Ednov-web/docs/10-dynamic-layout.md)
