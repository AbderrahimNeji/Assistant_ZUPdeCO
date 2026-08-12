# Branding - Couleurs et Logos (Backend)

## Vue d'ensemble

Le module branding gère la charte graphique complète de chaque company avec une **structure cohérente par TYPE** :
- **3 logos** (principal, monochrome, icône) avec variantes **Light et Dark**
- **3 couleurs** avec **3 nuances** chacune, pour **Light et Dark mode**

## Structure de Données (Option B - Par TYPE)

### Réponse API

```typescript
{
  logos: {
    logo1: { light: string, dark: string },  // Logo principal
    logo2: { light: string, dark: string },  // Logo monochrome
    logo3: { light: string, dark: string },  // Logo icône
    favicon: string                           // Favicon (commun)
  },
  colors: {
    color1: {
      nuance1: { light: string, dark: string },  // Boutons, icônes
      nuance2: { light: string, dark: string },  // Hover boutons
      nuance3: { light: string, dark: string }   // Hover menus
    },
    color2: {
      nuance1: { light: string, dark: string },  // Titres
      nuance2: { light: string, dark: string },  // Borders
      nuance3: { light: string, dark: string }   // Backgrounds
    },
    color3: {
      nuance1: { light: string, dark: string },  // Spinners
      nuance2: { light: string, dark: string },  // Hover
      nuance3: { light: string, dark: string }   // Variante
    }
  },
  customCss: string | null,
  fontFamily: string | null,
  fontUrl: string | null
}
```

## Base de Données

### Table `brandings`

```sql
-- Logos
logo1_light_url         VARCHAR(500)  -- Logo 1 (principal) light
logo1_dark_url          VARCHAR(500)  -- Logo 1 (principal) dark
logo2_light_url         VARCHAR(500)  -- Logo 2 (monochrome) light
logo2_dark_url          VARCHAR(500)  -- Logo 2 (monochrome) dark
logo3_light_url         VARCHAR(500)  -- Logo 3 (icône) light
logo3_dark_url          VARCHAR(500)  -- Logo 3 (icône) dark
favicon_url             VARCHAR(500)  -- Favicon (commun)

-- Couleurs Light Mode (9 colonnes)
light_color1_nuance1    VARCHAR(20)   -- Couleur 1, Nuance 1
light_color1_nuance2    VARCHAR(20)   -- Couleur 1, Nuance 2
light_color1_nuance3    VARCHAR(20)   -- Couleur 1, Nuance 3
light_color2_nuance1    VARCHAR(20)   -- Couleur 2, Nuance 1
light_color2_nuance2    VARCHAR(20)   -- Couleur 2, Nuance 2
light_color2_nuance3    VARCHAR(20)   -- Couleur 2, Nuance 3
light_color3_nuance1    VARCHAR(20)   -- Couleur 3, Nuance 1
light_color3_nuance2    VARCHAR(20)   -- Couleur 3, Nuance 2
light_color3_nuance3    VARCHAR(20)   -- Couleur 3, Nuance 3

-- Couleurs Dark Mode (9 colonnes)
dark_color1_nuance1     VARCHAR(20)
dark_color1_nuance2     VARCHAR(20)
dark_color1_nuance3     VARCHAR(20)
dark_color2_nuance1     VARCHAR(20)
dark_color2_nuance2     VARCHAR(20)
dark_color2_nuance3     VARCHAR(20)
dark_color3_nuance1     VARCHAR(20)
dark_color3_nuance2     VARCHAR(20)
dark_color3_nuance3     VARCHAR(20)

-- Autres
custom_css              TEXT
font_family             VARCHAR(100)
font_url                VARCHAR(500)
```

## Entity

### `branding.entity.ts`

```typescript
@Entity({ name: 'brandings' })
export class Branding extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id', unique: true })
  companyId: string;

  // Logos
  @Column({ type: 'varchar', length: 500, name: 'logo1_light_url', nullable: true })
  logo1LightUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo1_dark_url', nullable: true })
  logo1DarkUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo2_light_url', nullable: true })
  logo2LightUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo2_dark_url', nullable: true })
  logo2DarkUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo3_light_url', nullable: true })
  logo3LightUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo3_dark_url', nullable: true })
  logo3DarkUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'favicon_url', nullable: true })
  faviconUrl: string | null;

  // Light mode colors - Couleur 1
  @Column({ type: 'varchar', length: 20, name: 'light_color1_nuance1', nullable: true })
  lightColor1Nuance1: string | null;
  
  // ... (toutes les autres couleurs)
}
```

## Service

### Interface `CompleteBrandingDto`

```typescript
interface ModeValue {
  light: string | null;
  dark: string | null;
}

interface ColorWithNuances {
  nuance1: ModeValue;
  nuance2: ModeValue;
  nuance3: ModeValue;
}

export interface CompleteBrandingDto {
  logos: {
    logo1: ModeValue;
    logo2: ModeValue;
    logo3: ModeValue;
    favicon: string | null;
  };
  colors: {
    color1: ColorWithNuances;
    color2: ColorWithNuances;
    color3: ColorWithNuances;
  };
  customCss: string | null;
  fontFamily: string | null;
  fontUrl: string | null;
}
```

### Méthode `getCompleteBranding()`

Transforme les colonnes DB plates en structure imbriquée :

```typescript
async getCompleteBranding(companyId: string): Promise<CompleteBrandingDto> {
  const branding = await this.brandingRepository.findOne({ where: { companyId } });
  
  return {
    logos: {
      logo1: {
        light: branding?.logo1LightUrl ?? null,
        dark: branding?.logo1DarkUrl ?? null,
      },
      logo2: {
        light: branding?.logo2LightUrl ?? null,
        dark: branding?.logo2DarkUrl ?? null,
      },
      logo3: {
        light: branding?.logo3LightUrl ?? null,
        dark: branding?.logo3DarkUrl ?? null,
      },
      favicon: branding?.faviconUrl ?? null,
    },
    colors: {
      color1: {
        nuance1: {
          light: branding?.lightColor1Nuance1 ?? null,
          dark: branding?.darkColor1Nuance1 ?? null,
        },
        // ... etc
      },
      // ... color2, color3
    },
    customCss: branding?.customCss ?? null,
    fontFamily: branding?.fontFamily ?? null,
    fontUrl: branding?.fontUrl ?? null,
  };
}
```

## Controller

### GET `/api/v1/branding/complete`

```typescript
@Get('complete')
@UseGuards(FirebaseJwtGuard)
async getCompleteBranding(@CurrentUser() user: RequestUserPayload) {
  return this.brandingService.getCompleteBranding(user.companyId);
}
```

**Réponse** :

```json
{
  "logos": {
    "logo1": {
      "light": "https://cdn.example.com/logo1-light.png",
      "dark": "https://cdn.example.com/logo1-dark.png"
    },
    "logo2": {
      "light": "https://cdn.example.com/logo2-light.png",
      "dark": "https://cdn.example.com/logo2-dark.png"
    },
    "logo3": {
      "light": "https://cdn.example.com/logo3-light.png",
      "dark": "https://cdn.example.com/logo3-dark.png"
    },
    "favicon": "https://cdn.example.com/favicon.ico"
  },
  "colors": {
    "color1": {
      "nuance1": {
        "light": "#FF6B35",
        "dark": "#FF8C5A"
      },
      "nuance2": {
        "light": "#E55A2B",
        "dark": "#FF6B35"
      },
      "nuance3": {
        "light": "#CC4E24",
        "dark": "#E55A2B"
      }
    },
    "color2": { "..." },
    "color3": { "..." }
  },
  "customCss": null,
  "fontFamily": "Inter",
  "fontUrl": "https://fonts.googleapis.com/..."
}
```

### PUT `/api/v1/branding`

```typescript
@Put()
@UseGuards(FirebaseJwtGuard)
async putBranding(
  @CurrentUser() user: RequestUserPayload,
  @Body() dto: PutBrandingDto,
) {
  return this.brandingService.putBranding(user.companyId, dto, user.id);
}
```

**Body** (tous les champs optionnels) :

```json
{
  "logo1LightUrl": "https://...",
  "logo1DarkUrl": "https://...",
  "logo2LightUrl": "https://...",
  "logo2DarkUrl": "https://...",
  "logo3LightUrl": "https://...",
  "logo3DarkUrl": "https://...",
  "faviconUrl": "https://...",
  
  "lightColor1Nuance1": "#FF6B35",
  "lightColor1Nuance2": "#E55A2B",
  "lightColor1Nuance3": "#CC4E24",
  "lightColor2Nuance1": "#004E89",
  "lightColor2Nuance2": "#003A66",
  "lightColor2Nuance3": "#E8F4F8",
  "lightColor3Nuance1": "#1AA260",
  "lightColor3Nuance2": "#138A4D",
  "lightColor3Nuance3": "#D4F4E2",
  
  "darkColor1Nuance1": "#FF8C5A",
  "darkColor1Nuance2": "#FF6B35",
  "darkColor1Nuance3": "#E55A2B",
  "darkColor2Nuance1": "#4A9EFF",
  "darkColor2Nuance2": "#2B7FE6",
  "darkColor2Nuance3": "#1A3A5C",
  "darkColor3Nuance1": "#2ECC71",
  "darkColor3Nuance2": "#27AE60",
  "darkColor3Nuance3": "#1E5A3A",
  
  "customCss": "...",
  "fontFamily": "Inter",
  "fontUrl": "https://fonts.googleapis.com/..."
}
```

## DTO

### `PutBrandingDto`

```typescript
export class PutBrandingDto {
  // Logos
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo1LightUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo1DarkUrl?: string | null;

  // ... (tous les autres logos)

  // Light mode colors - Couleur 1
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor1Nuance1?: string | null;

  // ... (toutes les autres couleurs)
}
```

## Migration

### `1730000000006-RefactorBrandingWithClearNaming.ts`

Cette migration crée toutes les colonnes avec une nomenclature claire.

```bash
npm run migration:run
```

## Mapping des Couleurs

| Couleur | Nuance | Utilisation |
|---------|--------|-------------|
| **color1** | nuance1 | Boutons, icônes principales (menus sidebar) |
| | nuance2 | Hover des boutons |
| | nuance3 | Hover des menus |
| **color2** | nuance1 | Titres |
| | nuance2 | Borders colorés |
| | nuance3 | Backgrounds subtils |
| **color3** | nuance1 | Spinners, loaders |
| | nuance2 | États hover |
| | nuance3 | Variantes claires |

## Mapping des Logos

| Logo | Utilisation |
|------|-------------|
| **logo1** | Logo principal (navbar, sidebar expanded) |
| **logo2** | Logo monochrome (variante) |
| **logo3** | Logo icône (sidebar collapsed, favicon) |

## Exemples

### Créer/Mettre à jour le branding

```typescript
const branding = await this.brandingService.putBranding(companyId, {
  logo1LightUrl: 'https://cdn.example.com/logo1-light.png',
  logo1DarkUrl: 'https://cdn.example.com/logo1-dark.png',
  logo3LightUrl: 'https://cdn.example.com/icon-light.png',
  logo3DarkUrl: 'https://cdn.example.com/icon-dark.png',
  
  lightColor1Nuance1: '#FF6B35',
  lightColor1Nuance2: '#E55A2B',
  lightColor1Nuance3: '#CC4E24',
  
  darkColor1Nuance1: '#FF8C5A',
  darkColor1Nuance2: '#FF6B35',
  darkColor1Nuance3: '#E55A2B',
}, userId);
```

### Récupérer le branding

```typescript
const branding = await this.brandingService.getCompleteBranding(companyId);

// Accéder au logo principal dark
console.log(branding.logos.logo1.dark);

// Accéder à la couleur 1 nuance 1 light
console.log(branding.colors.color1.nuance1.light);
```

## Sécurité

- ✅ Routes protégées par `FirebaseJwtGuard`
- ✅ Modifications limitées au `companyId` de l'utilisateur
- ✅ Validation des URLs avec `@IsUrl()`
- ✅ Limitation de la longueur des champs
- ✅ Audit trail complet via `AuditLogService`

## Performance

- Les données de branding sont chargées **une seule fois** au démarrage de l'application frontend
- Pas de cache côté backend (les données changent rarement)
- Considérer un cache Redis si nécessaire pour de très gros volumes
