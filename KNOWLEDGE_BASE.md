# PhoneStore - Knowledge Base

## Vue d'ensemble

**PhoneStore** est une application web full-stack pour la gestion de ventes de téléphones, inventaire, relation client et services de réparation. Construite avec React 18 + TypeScript (frontend) et Hono/EdgeSpark avec SQLite (backend).

### Fonctionnalités principales
- Point de vente (POS) interactif
- Gestion des réparations (intake → livraison)
- Gestion des stocks avec alertes
- Gestion de la relation client
- Sessions de caisse (ouverture/fermeture)
- Configuration multi-devises (défaut: Dinar Tunisien)

---

## 1. Structure du Projet

```
C:\opencode.ai\arouastore\
├── src/                              # Code source frontend
│   ├── pages/                        # Pages de l'application (18 pages)
│   ├── components/                   # Composants UI réutilisables
│   ├── layouts/                      # Layouts (DashboardLayout)
│   ├── store/                        # State management (Zustand)
│   ├── api/                          # Client API
│   ├── types/                        # Types TypeScript
│   ├── App.tsx                       # Composant principal + routing
│   └── main.tsx                      # Point d'entrée React
├── backend/                          # API Backend
│   ├── src/
│   │   ├── index.ts                  # Serveur API Hono (1100+ lignes)
│   │   └── __generated__/            # Fichiers auto-générés
│   │       ├── db_schema.ts          # Schéma DB (Drizzle ORM)
│   │       └── db_relations.ts       # Relations entre tables
│   └── package.json
├── package.json                      # Dépendances frontend
├── vite.config.ts                    # Configuration Vite
├── tailwind.config.js                # Configuration Tailwind CSS
└── tsconfig.json                     # Configuration TypeScript
```

---

## 2. Stack Technologique

### Frontend
| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.8.3 | Typage statique |
| Vite | 7.0.0 | Build tool |
| Tailwind CSS | 3.4.17 | Styling |
| React Router | 6.30.1 | Routing |
| Zustand | 4.4.7 | State management |
| Framer Motion | 11.0.8 | Animations |
| Lucide React | 0.533.0 | Icônes |
| Zod | 3.25.67 | Validation |

### Backend
| Technologie | Usage |
|-------------|-------|
| Hono | Framework web léger |
| Drizzle ORM | ORM pour SQLite |
| SQLite | Base de données |
| EdgeSpark | Plateforme + Auth |

---

## 3. Pages de l'Application

### Pages Principales

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Vue d'ensemble: CA du jour, réparations actives, clients, alertes stock |
| POS | `/pos` | Interface de vente: panier, recherche produits, paiement |
| Cash Register | `/cash-register` | Ouverture/fermeture de caisse, historique sessions |
| Customers | `/customers` | Gestion clients, historique achats/réparations |
| Repairs | `/repairs` | Gestion des réparations (new → diagnostic → repair → delivered) |
| Inventory | `/inventory` | Gestion des stocks, alertes, édition inline |

### Pages Admin (role: admin)

| Page | Route | Description |
|------|-------|-------------|
| Admin Config | `/admin` | Hub de configuration admin |
| Users Admin | `/admin/users` | Gestion des utilisateurs et rôles |
| Product Management | `/admin/products` | CRUD produits |
| Device Brands | `/admin/device-brands` | Gestion marques/modèles téléphones |
| Currency Settings | `/admin/currency` | Configuration devise et format prix |
| Store Settings | `/admin/store` | Infos boutique, horaires |
| Admin Profile | `/admin/profile` | Profil administrateur |

---

## 4. Schéma Base de Données

### Tables Principales

#### **users**
```sql
id          INTEGER PRIMARY KEY AUTO
name        TEXT NOT NULL
email       TEXT NOT NULL UNIQUE
role        TEXT DEFAULT 'agent'  -- admin, manager, agent
createdAt   INTEGER (UNIX_TIMESTAMP)
```

#### **products**
```sql
id              INTEGER PRIMARY KEY AUTO
sku             TEXT NOT NULL
name            TEXT NOT NULL
category        TEXT NOT NULL  -- phone, accessory, component
brand           TEXT
model           TEXT
pricePurchase   INTEGER DEFAULT 0  -- en millimes
priceSale       INTEGER DEFAULT 0  -- en millimes
stock           INTEGER DEFAULT 0
alertThreshold  INTEGER DEFAULT 5
imageUrl        TEXT
isActive        INTEGER DEFAULT 1
createdAt       INTEGER (UNIX_TIMESTAMP)
updatedAt       INTEGER (UNIX_TIMESTAMP)
```

#### **customers**
```sql
id          INTEGER PRIMARY KEY AUTO
phone       TEXT NOT NULL
name        TEXT NOT NULL
firstVisit  INTEGER (UNIX_TIMESTAMP)
totalSpent  INTEGER DEFAULT 0  -- en millimes
createdAt   INTEGER (UNIX_TIMESTAMP)
```

#### **sales**
```sql
id              INTEGER PRIMARY KEY AUTO
customerId      INTEGER FK -> customers.id (nullable)
userId          INTEGER FK -> users.id
total           INTEGER  -- en millimes
discount        INTEGER DEFAULT 0
paymentMethod   TEXT  -- cash, card, mobile
status          TEXT DEFAULT 'completed'  -- completed, cancelled, refunded
createdAt       INTEGER (UNIX_TIMESTAMP)
```

#### **sale_items**
```sql
id          INTEGER PRIMARY KEY AUTO
saleId      INTEGER FK -> sales.id
productId   INTEGER FK -> products.id
quantity    INTEGER
unitPrice   INTEGER  -- en millimes
subtotal    INTEGER  -- en millimes
```

#### **repairs**
```sql
id                  INTEGER PRIMARY KEY AUTO
customerId          INTEGER FK -> customers.id
deviceBrand         TEXT NOT NULL
deviceModel         TEXT NOT NULL
deviceVariant       TEXT
devicePassword      TEXT
physicalState       TEXT  -- excellent, good, fair, poor, broken
issueDescription    TEXT NOT NULL
diagnosis           TEXT
status              TEXT DEFAULT 'new'  -- new, diagnostic, repair, delivered
estimatedCost       INTEGER DEFAULT 0
finalCost           INTEGER
technicianId        INTEGER FK -> users.id
promisedDate        INTEGER (UNIX_TIMESTAMP)
deliveredAt         INTEGER (UNIX_TIMESTAMP)
createdAt           INTEGER (UNIX_TIMESTAMP)
updatedAt           INTEGER (UNIX_TIMESTAMP)
```

#### **cash_sessions**
```sql
id              INTEGER PRIMARY KEY AUTO
userId          INTEGER FK -> users.id
openingAmount   INTEGER  -- montant d'ouverture
closingAmount   INTEGER  -- montant de fermeture
expectedAmount  INTEGER  -- opening + ventes cash
difference      INTEGER  -- closing - expected
openedAt        INTEGER (UNIX_TIMESTAMP)
closedAt        INTEGER (UNIX_TIMESTAMP)
notes           TEXT
```

#### **user_roles**
```sql
id          INTEGER PRIMARY KEY AUTO
authUserId  TEXT NOT NULL UNIQUE  -- ID du système d'auth
role        TEXT DEFAULT 'agent'
email       TEXT
name        TEXT
createdAt   INTEGER (UNIX_TIMESTAMP)
```

#### **device_brands**
```sql
id          INTEGER PRIMARY KEY AUTO
name        TEXT NOT NULL
logoUrl     TEXT
isActive    INTEGER DEFAULT 1
sortOrder   INTEGER
createdAt   INTEGER (UNIX_TIMESTAMP)
```

#### **device_models**
```sql
id          INTEGER PRIMARY KEY AUTO
brandId     INTEGER FK -> device_brands.id
name        TEXT NOT NULL
variant     TEXT
isActive    INTEGER DEFAULT 1
sortOrder   INTEGER
createdAt   INTEGER (UNIX_TIMESTAMP)
```

---

## 5. API Endpoints

### Convention des Paths
- `/api/*` - Authentification requise
- `/api/public/*` - Authentification optionnelle
- `/api/admin/*` - Rôle admin requis

### Products
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/products` | Liste produits (filtres: category, search, lowStock) |
| GET | `/api/public/products/:id` | Détail produit |
| POST | `/api/products` | Créer produit |
| PUT | `/api/products/:id` | Modifier produit |
| DELETE | `/api/products/:id` | Supprimer produit |

### Customers
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/customers` | Liste clients (filtre: search) |
| GET | `/api/public/customers/:id` | Détail client |
| POST | `/api/customers` | Créer client |
| PUT | `/api/customers/:id` | Modifier client |
| GET | `/api/public/customers/:id/history` | Historique client (ventes + réparations) |

### Sales
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/sales` | Liste ventes (filtres: limit, startDate, endDate) |
| GET | `/api/public/sales/:id` | Détail vente avec items |
| POST | `/api/sales` | Créer vente (met à jour stock + totalSpent client) |
| PUT | `/api/sales/:id/cancel` | Annuler vente (restore stock) |

### Repairs
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/repairs` | Liste réparations (filtres: status, customerId) |
| GET | `/api/public/repairs/:id` | Détail réparation |
| POST | `/api/repairs` | Créer réparation |
| PUT | `/api/repairs/:id` | Modifier réparation |
| PATCH | `/api/repairs/:id/status` | Changer statut uniquement |
| GET | `/api/repairs/:repairId/components` | Composants utilisés |
| PUT | `/api/repairs/:repairId/components` | Définir composants |

### Cash Sessions
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/cash-sessions/current` | Session ouverte actuelle |
| GET | `/api/public/cash-sessions` | Historique sessions |
| POST | `/api/cash-sessions/open` | Ouvrir session |
| PUT | `/api/cash-sessions/:id/close` | Fermer session |

### Dashboard & Stats
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/stats/dashboard` | Stats dashboard (CA jour, réparations, alertes) |
| GET | `/api/public/stats/sales` | Stats ventes par période |

### Users (Admin)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/me/role` | Rôle de l'utilisateur connecté |
| GET | `/api/admin/users` | Liste tous les utilisateurs |
| POST | `/api/admin/users` | Créer utilisateur |
| POST | `/api/admin/users/role` | Définir rôle utilisateur |
| DELETE | `/api/admin/users/:id` | Supprimer utilisateur |

### Device Brands & Models (Admin)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/device-brands` | Liste marques |
| POST | `/api/admin/device-brands` | Créer marque |
| PUT | `/api/admin/device-brands/:id` | Modifier marque |
| DELETE | `/api/admin/device-brands/:id` | Supprimer marque |
| GET | `/api/public/device-brands/:id/models` | Modèles d'une marque |
| POST | `/api/admin/device-models` | Créer modèle |
| PUT | `/api/admin/device-models/:id` | Modifier modèle |
| DELETE | `/api/admin/device-models/:id` | Supprimer modèle |

---

## 6. State Management (Zustand)

### useAuthStore (`store/authStore.ts`)
```typescript
interface AuthState {
  user: User | null;
  isChecking: boolean;
  setUser(user): void;
  setUserRole(role): void;
  reset(): void;
}
// Persisté dans localStorage: 'phonestore-auth'
```

### useStore (`store/useStore.ts`)
```typescript
interface StoreState {
  cart: CartItem[];
  products: Product[];
  sales: Sale[];
  repairs: Repair[];
  customers: Customer[];
  dashboardStats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addToCart(product): void;
  removeFromCart(productId): void;
  updateCartQuantity(id, quantity): void;
  clearCart(): void;
  fetchProducts(filters?): Promise<void>;
  fetchSales(limit?): Promise<void>;
  fetchRepairs(): Promise<void>;
  fetchCustomers(search?): Promise<void>;
  fetchDashboardStats(): Promise<void>;
  checkout(customerId?, discount?, paymentMethod?): Promise<void>;
  createRepair(data): Promise<void>;
  updateRepair(id, updates): Promise<void>;
  // ... autres actions
}
```

### useSettingsStore (`pages/CurrencySettings.tsx`)
```typescript
interface SettingsState {
  currency: {
    code: string;      // ex: 'TND'
    symbol: string;    // ex: 'DT'
    position: 'before' | 'after';
    decimals: number;  // ex: 3 pour TND
    thousandsSeparator: string;
    decimalSeparator: string;
  };
  formatPrice(amount: number): string;  // Convertit millimes → affichage
}
// Persisté dans localStorage: 'phonestore-settings'
```

---

## 7. Workflows Métier

### Workflow Vente (POS)
1. Vérifier session caisse ouverte (requis)
2. Rechercher/ajouter produits au panier
3. Sélectionner/créer client (optionnel)
4. Appliquer remise (% ou montant fixe)
5. Ouvrir modal paiement
6. Choisir méthode (cash/carte/mobile)
7. Pour cash: saisir montant reçu → calcul monnaie
8. Confirmer paiement
9. Vente créée, stock décrémenté, totalSpent client mis à jour

### Workflow Réparation
1. Créer ticket:
   - Sélectionner client
   - Choisir marque → modèle (chargement dynamique)
   - Décrire problème
   - État physique, mot de passe, variante
   - Coût estimé
2. Progression statuts: `new` → `diagnostic` → `repair` → `delivered`
3. Ajouter composants utilisés
4. Marquer livré (deliveredAt auto-rempli)

### Workflow Session Caisse
1. Ouvrir session avec montant initial
2. Effectuer ventes (uniquement si session ouverte)
3. Fermer session:
   - Saisir montant final
   - Calcul attendu = ouverture + ventes cash
   - Affichage écart

---

## 8. Configuration & Styling

### Thème Couleurs (Tailwind)
```javascript
colors: {
  primary: {
    // Cyan/Blue: #0ea5e9 → #0284c7
  },
  dark: {
    bg: '#0f172a',      // slate-950
    surface: '#1e293b', // slate-800
    border: '#334155',  // slate-700
  }
}
```

### Devises Supportées
- TND (Dinar Tunisien) - défaut, 3 décimales
- XOF/XAF (Franc CFA) - 0 décimales
- EUR (Euro) - 2 décimales
- USD (Dollar) - 2 décimales
- MAD (Dirham) - 2 décimales
- Et autres...

### Format des Prix
- Stockage: en millimes/centimes (INTEGER)
- Affichage: `formatPrice()` divise par 10^decimals
- Exemple TND: `779360` millimes → `779,360 DT`

---

## 9. Rôles & Permissions

| Rôle | Accès |
|------|-------|
| **admin** | Toutes les pages, gestion users, config boutique |
| **manager** | Pages principales (POS, repairs, inventory, customers, cash) |
| **agent** | Pages principales (POS, repairs, inventory, customers, cash) |

---

## 10. API Client Configuration

```typescript
// src/api/client.ts
const API_URL = 'http://localhost:3001';

// Headers d'auth (mode développement local)
headers: {
  'x-auth-user-id': '...',
  'x-auth-email': '...',
  'x-auth-name': '...'
}
```

---

## 11. Commandes de Développement

```bash
# Installation
npm install

# Développement (frontend uniquement)
npm run dev
# → http://127.0.0.1:5173

# Backend local (si disponible)
npm run backend
# → http://localhost:3001

# Frontend + Backend
npm run start

# Build production
npm run build
# → dist/
```

---

## 12. Types TypeScript Principaux

```typescript
// types/index.ts

type ProductCategory = 'phone' | 'accessory' | 'component';
type RepairStatus = 'new' | 'diagnostic' | 'repair' | 'delivered';
type PaymentMethod = 'cash' | 'card' | 'mobile';
type SaleStatus = 'completed' | 'cancelled' | 'refunded';
type UserRole = 'admin' | 'manager' | 'agent';

interface Product {
  id: number;
  sku: string;
  name: string;
  category: ProductCategory;
  brand?: string;
  model?: string;
  pricePurchase: number;
  priceSale: number;
  stock: number;
  alertThreshold: number;
  imageUrl?: string;
  isActive: boolean;
}

interface Customer {
  id: number;
  phone: string;
  name: string;
  totalSpent: number;
}

interface Sale {
  id: number;
  customerId?: number;
  total: number;
  discount: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  createdAt: number;
}

interface Repair {
  id: number;
  customerId: number;
  deviceBrand: string;
  deviceModel: string;
  issueDescription: string;
  status: RepairStatus;
  estimatedCost: number;
  finalCost?: number;
}

interface CashSession {
  id: number;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  difference?: number;
  openedAt: number;
  closedAt?: number;
}
```

---

## 13. Notes Importantes

### Stockage des Prix
- **TOUJOURS en millimes/centimes** dans la DB
- Conversion à l'affichage via `formatPrice()`
- Pour TND (3 décimales): `amount / 1000`
- Pour EUR (2 décimales): `amount / 100`

### Session Caisse
- **Obligatoire** pour créer une vente
- Une seule session ouverte à la fois
- Calcul automatique du montant attendu

### Authentification
- Gérée par EdgeSpark en production
- Headers simulés en développement local
- Rôles stockés dans table `user_roles`

### Backend EdgeSpark
- Pas de `npm run dev` standard
- Déployé sur plateforme edge
- Utiliser `npm run start` pour mode local complet

---

*Dernière mise à jour: Février 2026*
