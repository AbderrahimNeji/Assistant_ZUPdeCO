# API Endpoints - EdNov Backend

## 🌐 Vue d'Ensemble

Cette page documente **TOUS** les endpoints API disponibles pour le frontend.

## 🔑 Authentification

**Tous les endpoints** (sauf `/health`) nécessitent un token Firebase JWT.

**Header:**
```
Authorization: Bearer <FIREBASE_JWT_TOKEN>
```

---

## 📊 ENDPOINTS PRINCIPAUX

### 1. Branding

#### GET /api/v1/branding/complete

**Description:** Récupérer la charte graphique complète (logos + couleurs) avec structure cohérente.

**Auth:** ✅ Requis

**Response:**
```json
{
  "logos": {
    "logo1": {
      "light": "https://cdn.ednov.com/logo1-light.png",
      "dark": "https://cdn.ednov.com/logo1-dark.png"
    },
    "logo2": {
      "light": "https://cdn.ednov.com/logo2-light.png",
      "dark": "https://cdn.ednov.com/logo2-dark.png"
    },
    "logo3": {
      "light": "https://cdn.ednov.com/logo3-light.png",
      "dark": "https://cdn.ednov.com/logo3-dark.png"
    },
    "favicon": "https://cdn.ednov.com/favicon.ico"
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
    "color2": {
      "nuance1": {
        "light": "#004E89",
        "dark": "#4A9EFF"
      },
      "nuance2": {
        "light": "#003A66",
        "dark": "#2B7FE6"
      },
      "nuance3": {
        "light": "#E8F4F8",
        "dark": "#1A3A5C"
      }
    },
    "color3": {
      "nuance1": {
        "light": "#1AA260",
        "dark": "#2ECC71"
      },
      "nuance2": {
        "light": "#138A4D",
        "dark": "#27AE60"
      },
      "nuance3": {
        "light": "#D4F4E2",
        "dark": "#1E5A3A"
      }
    }
  },
  "customCss": null,
  "fontFamily": "'Poppins', sans-serif",
  "fontUrl": "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
}
```

**Utilisation Frontend:**
```typescript
import { getBranding } from '@/services/branding.service';

const branding = await getBranding();
setBranding(branding); // Store Zustand

// Accéder aux données
const mode = isDarkMode ? 'dark' : 'light';
const logo = branding.logos.logo1[mode];
const buttonColor = branding.colors.color1.nuance1[mode];
```

---

### 2. User Preferences

#### GET /api/v1/user-preferences

**Description:** Récupérer les préférences de l'utilisateur connecté.

**Auth:** ✅ Requis

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "companyId": "uuid",
  "isDarkMode": true,
  "interfaceConfigs": {
    "dashboard": {
      "filters": { "period": "current-month" },
      "order": ["card-1", "card-2", "card-3"],
      "columns": ["name", "email", "status"]
    },
    "courses": {
      "filters": { "status": "active" }
    }
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Utilisation Frontend:**
```typescript
import { getUserPreferences } from '@/services/preferences.service';

const prefs = await getUserPreferences();
console.log(prefs.isDarkMode);
console.log(prefs.interfaceConfigs.dashboard);
```

---

#### PUT /api/v1/user-preferences

**Description:** Mettre à jour les préférences globales de l'utilisateur.

**Auth:** ✅ Requis

**Request Body:**
```json
{
  "isDarkMode": true,
  "interfaceConfigs": {
    "dashboard": {
      "filters": { "period": "current-week" }
    }
  }
}
```

**Response:** Même structure que GET

**Utilisation Frontend:**
```typescript
import { updateUserPreferences } from '@/services/preferences.service';

await updateUserPreferences({
  isDarkMode: true,
});
```

---

#### PATCH /api/v1/user-preferences/interface/:interfaceName

**Description:** Mettre à jour la configuration d'une interface spécifique.

**Auth:** ✅ Requis

**Params:**
- `interfaceName` - Nom de l'interface (ex: 'dashboard', 'courses')

**Request Body:**
```json
{
  "config": {
    "filters": { "period": "current-month" },
    "order": ["card-1", "card-2", "card-3"]
  }
}
```

**Response:** UserPreferences complet

**Utilisation Frontend:**
```typescript
import { updateInterfaceConfig } from '@/services/preferences.service';

await updateInterfaceConfig('dashboard', {
  filters: { period: 'current-month' },
  order: ['card-1', 'card-2', 'card-3'],
});
```

---

### 3. Interface Elements

#### GET /api/v1/interface-elements/:interfaceName

**Description:** Récupérer les éléments d'une interface avec permissions et préférences.

**Auth:** ✅ Requis

**Params:**
- `interfaceName` - Nom de l'interface (ex: 'dashboard', 'courses')

**Response:**
```json
[
  {
    "id": "uuid",
    "interfaceName": "dashboard",
    "elementId": "card-total-students",
    "elementType": "stat_card",
    "elementLabel": "Total Students",
    "defaultVisible": true,
    "defaultOrder": 0,
    "defaultWidth": "1/3",
    "config": {
      "value": 245,
      "iconColor": "text-primary",
      "iconBgColor": "bg-primary/10",
      "description": "Active students",
      "trend": { "value": 12, "isPositive": true }
    },
    "canView": true,
    "canEdit": false,
    "canCustomize": true,
    "userVisible": true,
    "userOrder": 0
  },
  {
    "id": "uuid",
    "interfaceName": "dashboard",
    "elementId": "table-sessions",
    "elementType": "table",
    "elementLabel": "Sessions List",
    "defaultVisible": true,
    "defaultOrder": 1,
    "defaultWidth": "full",
    "config": {
      "columns": ["name", "date", "teacher", "status"]
    },
    "canView": true,
    "canEdit": true,
    "canCustomize": true,
    "userVisible": true,
    "userOrder": 1
  }
]
```

**Logique Backend:**
1. Récupère tous les éléments de l'interface
2. Récupère les rôles de l'utilisateur
3. Applique les permissions (OR logic si plusieurs rôles)
4. Récupère les préférences utilisateur
5. Merge tout et retourne

**Utilisation Frontend:**
```typescript
import { getInterfaceElements } from '@/services/interface-elements.service';

const elements = await getInterfaceElements('dashboard');
console.log(elements);
```

---

## 🔐 AUTHENTIFICATION

### Firebase JWT

**Obtenir le Token:**
```typescript
import { auth } from '@/config/firebase';

const user = auth.currentUser;
if (user) {
  const token = await user.getIdToken();
  console.log('Token:', token);
}
```

**Le token est automatiquement ajouté par `api-client.ts`:**
```typescript
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 🧪 TESTER LES ENDPOINTS

### Avec curl

```bash
# 1. Obtenir le token Firebase (depuis la console du navigateur)
const token = await firebase.auth().currentUser.getIdToken();
console.log(token);

# 2. Tester l'endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/branding/complete | jq

# 3. Tester avec body
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isDarkMode": true}' \
  http://localhost:3000/api/v1/user-preferences | jq
```

### Avec Postman

1. Créer une nouvelle requête
2. Ajouter le header `Authorization: Bearer YOUR_TOKEN`
3. Envoyer la requête

### Avec Thunder Client (VS Code)

1. Installer l'extension Thunder Client
2. Créer une collection "EdNov API"
3. Ajouter les requêtes avec le token

---

## 📋 ENDPOINTS COMPLETS

### Branding

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/branding/complete` | Charte graphique complète |

### User Preferences

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/user-preferences` | Préférences utilisateur |
| PUT | `/api/v1/user-preferences` | Mettre à jour les préférences |
| PATCH | `/api/v1/user-preferences/interface/:interfaceName` | Mettre à jour une interface |

### Interface Elements

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/interface-elements/:interfaceName` | Éléments d'une interface |

---

## 🔄 CODES DE STATUT HTTP

### Success

- `200 OK` - Requête réussie (GET, PUT, PATCH)
- `201 Created` - Ressource créée (POST)
- `204 No Content` - Suppression réussie (DELETE)

### Client Errors

- `400 Bad Request` - Données invalides
- `401 Unauthorized` - Token manquant ou invalide
- `403 Forbidden` - Pas de permission
- `404 Not Found` - Ressource introuvable

### Server Errors

- `500 Internal Server Error` - Erreur serveur

---

## 🚨 GESTION DES ERREURS

### Format d'Erreur

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Gérer les Erreurs Frontend

```typescript
import { useToast } from '@/hooks/use-toast';

try {
  await createStudent(formData);
  toast({ title: 'Student created' });
} catch (error: any) {
  toast({
    title: 'Error',
    description: error.response?.data?.message || 'An error occurred',
    variant: 'destructive',
  });
}
```

---

## 📚 SWAGGER DOCUMENTATION

### Accéder à Swagger

**URL:** `http://localhost:3000/api`

### Tester avec Swagger

1. Ouvrir `http://localhost:3000/api`
2. Cliquer sur "Authorize"
3. Entrer le token Firebase: `Bearer YOUR_TOKEN`
4. Tester les endpoints

---

## 🎯 EXEMPLES D'UTILISATION

### Exemple 1 : Charger le Branding au Démarrage

```typescript
// src/app/App.tsx
import { useEffect } from 'react';
import { getBranding } from '@/services/branding.service';
import { useThemeStore } from '@/stores/themeStore';

function App() {
  const { setBranding } = useThemeStore();

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const branding = await getBranding();
        setBranding(branding);
      } catch (error) {
        console.error('Failed to load branding:', error);
      }
    };

    loadBranding();
  }, []);

  return <Router />;
}
```

### Exemple 2 : Charger les Préférences au Login

```typescript
// src/hooks/useAuth.ts
import { getUserPreferences } from '@/services/preferences.service';
import { useAuthStore } from '@/stores/authStore';

export const useAuth = () => {
  const { setPreferences } = useAuthStore();

  const login = async (email: string, password: string) => {
    // 1. Login Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 2. Charger les préférences
    const prefs = await getUserPreferences();
    setPreferences(prefs);
    
    // 3. Appliquer le dark mode
    if (prefs.isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  };

  return { login };
};
```

### Exemple 3 : Charger les Éléments d'une Interface

```typescript
// src/hooks/useInterfaceElements.ts
import { useQuery } from '@tanstack/react-query';
import { getInterfaceElements } from '@/services/interface-elements.service';

export const useInterfaceElements = (interfaceName: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['interface-elements', interfaceName],
    queryFn: () => getInterfaceElements(interfaceName),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filtrer et trier
  const elements = React.useMemo(() => {
    if (!data) return [];
    
    return data
      .filter(el => el.canView && (el.userVisible ?? el.defaultVisible))
      .sort((a, b) => (a.userOrder ?? a.defaultOrder) - (b.userOrder ?? b.defaultOrder));
  }, [data]);

  return { elements, isLoading, error };
};
```

### Exemple 4 : Sauvegarder l'Ordre des Éléments

```typescript
// src/features/dashboard/EditableDashboard.tsx
import { updateInterfaceConfig } from '@/services/preferences.service';

function EditableDashboard() {
  const handleReorder = async (reorderedElements: InterfaceElement[]) => {
    try {
      await updateInterfaceConfig('dashboard', {
        order: reorderedElements.map(el => el.elementId),
      });
      
      toast({ title: 'Layout saved' });
    } catch (error) {
      toast({ title: 'Error saving layout', variant: 'destructive' });
    }
  };

  return (
    <AdvancedDynamicLayout
      elements={elements}
      onReorder={handleReorder}
      editMode={editMode}
      renderElement={...}
    />
  );
}
```

---

## 🔧 CONFIGURATION

### Variables d'Environnement

**Fichier:** `.env`

```bash
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
```

### API Client Configuration

**Fichier:** `src/services/api-client.ts`

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
});
```

---

## 📖 CHECKLIST

### Pour Chaque Nouvel Endpoint

#### Backend ✅

- [ ] Créer le DTO (Request)
- [ ] Créer le DTO (Response)
- [ ] Créer la méthode dans le service
- [ ] Créer l'endpoint dans le controller
- [ ] Ajouter les décorateurs Swagger
- [ ] Vérifier les permissions
- [ ] Tester avec Postman/curl

#### Frontend ✅

- [ ] Créer la fonction dans le service
- [ ] Typer la requête et la réponse
- [ ] Créer un hook si nécessaire
- [ ] Gérer les erreurs
- [ ] Invalider les caches si mutation
- [ ] Tester dans l'application

---

**Ce document est LA RÉFÉRENCE pour les endpoints API.**

**À consulter AVANT d'appeler une API ! 🌐**
