# Guide de Déploiement ArouaStore sur Render

Ce guide explique comment déployer l'application complète (frontend React + backend Express + base de données TiDB) sur Render en utilisant leur offre gratuite.

## Pourquoi Render ?

- ✅ **Gratuit** : 750h/mois de compute
- ✅ **Sans carte bancaire** : Inscription simple avec GitHub
- ✅ **Support complet** : Node.js, Python, Go, Ruby, etc.
- ✅ **Base de données** : PostgreSQL gratuit inclus (si besoin)
- ✅ **Custom domains** : HTTPS inclus automatiquement
- ✅ **Continuous Deployment** : Déploiement automatique depuis GitHub

## Architecture du Déploiement

```
+─────────────────────────────────────┐
+         Render Web Service           │
+  ┌─────────────────────────────┐    │
+  │     Backend (Express)       │    │
+  │     Port 3001              │    │
+  └─────────────────────────────┘    │
+  ┌─────────────────────────────┐    │
+  │   Frontend (React/Vite)    │    │
+  │   Servi par Express        │    │
+  └─────────────────────────────┘    │
+  ┌─────────────────────────────┐    │
+  │   TiDB Cloud (MySQL)       │    │
+  │   Connexion persistante     │    │
+  └─────────────────────────────┘    │
+─────────────────────────────────────┘
```

## Prérequis

1. **Compte GitHub** avec le code source pushé
2. **Compte Render** (créer sur https://render.com avec ton compte GitHub)
3. **Base de données TiDB Cloud** (déjà configurée avec tes credentials)

## Étape 1 : Préparer le Code pour Production

### Modifier le Backend pour Servir le Frontend

Ouvre `local-backend/server.cjs` et ajoute le code pour servir les fichiers statiques du build React. Ajoute ce code après les imports et avant les routes API :

```javascript
// Chemins pour les fichiers statiques
const path = require('path');

// Servir les fichiers statiques du frontend en production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../dist');
  app.use(express.static(buildPath));
  
  // Toutes les routes non-API retournent index.html (SPA support)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    }
  });
}
```

### Créer le Fichier render.yaml

Crée un fichier `render.yaml` à la racine du projet pour la configuration Render :

```yaml
services:
  - type: web
    name: arouastore
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: DB_HOST
        fromDatabase:
          name: tidb
          property: host
      - key: DB_PORT
        fromDatabase:
          name: tidb
          property: port
      - key: DB_USER
        fromDatabase:
          name: tidb
          property: user
      - key: DB_PASSWORD
        fromDatabase:
          name: tidb
          property: password
      - key: DB_NAME
        fromDatabase:
          name: tidb
          property: database

databases:
  - name: tidb
    plan: free
    databaseName: POS
    user: root
```

### Modifier le package.json

Ajoute le script de production dans ton `package.json` :

```json
{
  "scripts": {
    "dev": "vite",
    "backend": "node local-backend/server.cjs",
    "start": "concurrently \"npm run backend\" \"npm run dev\"",
    "build": "npx vite build",
    "start:prod": "NODE_ENV=production node local-backend/server.cjs",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

### Créer un .gitignore Approprié

Assure-toi que le fichier `.gitignore` contient :

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/

# Misc
*.local
```

## Étape 2 : Configurer les Variables d'Environnement

### Variables Requises

Tu devras configurer ces variables dans Render :

```env
# Base de données TiDB Cloud
DB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=2Kkkuv3PHyG2RBg.root
DB_PASSWORD=1fYFk5J50aTjVgcl
DB_NAME=POS

# Configuration serveur
NODE_ENV=production
PORT=3000

# Sécurité (génère avec: openssl rand -base64 32)
SESSION_SECRET=ton_secret_tres_long_et_securise_ici
```

**Important** : Ces valeurs sont tes credentials TiDB Cloud actuels. Conserve-les en lieu sûr.

## Étape 3 : Déployer sur Render

### Option A : Via Dashboard Render

1. **Créer un nouveau Web Service**
   - Va sur https://dashboard.render.com
   - Clique "New +" puis "Web Service"
   - Connecte ton compte GitHub si nécessaire
   - Sélectionne ton repository `arouastore`

2. **Configurer le service**
   - **Name** : `arouastore` (ou le nom que tu préfères)
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm run start:prod`
   - **Plan** : `Free`

3. **Configurer les variables d'environnement**
   - Clique sur "Advanced"
   - Ajoute chaque variable une par une :
     ```
     DB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
     DB_PORT=4000
     DB_USER=2Kkkuv3PHyG2RBg.root
     DB_PASSWORD=1fYFk5J50aTjVgcl
     DB_NAME=POS
     NODE_ENV=production
     PORT=3000
     ```

4. **Déployer**
   - Clique "Create Web Service"
   - Render va installer les dépendances et builder l'application
   - Attends la fin du déploiement (~2-5 minutes)

5. **Vérifier le déploiement**
   - Une fois déployé, clique sur l'URL fournie (ex: `https://arouastore.onrender.com`)
   - L'application devrait charger correctement

### Option B : Via Render CLI

```bash
# Installer Render CLI
npm install -g @render/comugo

# Se connecter
render login

# Initialiser le projet
render init

# Définir les variables d'environnement
render config set DB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
render config set DB_PORT=4000
render config set DB_USER=2Kkkuv3PHyG2RBg.root
render config set DB_PASSWORD=1fYFk5J50aTjVgcl
render config set DB_NAME=POS
render config set NODE_ENV=production
render config set PORT=3000

# Déployer
render deploy

# Ouvrir l'application
render open
```

## Étape 4 : Tester le Déploiement

Une fois déployé, teste les différents endpoints :

```bash
# Remplace {app-name} par le nom de ton service Render
BASE_URL=https://{app-name}.onrender.com

# Test de la page d'accueil
curl ${BASE_URL}

# Test des API
curl ${BASE_URL}/api/public/products
curl ${BASE_URL}/api/public/sales
curl ${BASE_URL}/api/public/customers

# Test des réparations (notre dernière correction)
curl "${BASE_URL}/api/public/reports/repairs?from=1704067200&to=1735689599"
```

### Vérifier les Logs

Si quelque chose ne fonctionne pas, consulte les logs :

1. Va sur ton Dashboard Render
2. Clique sur ton service `arouastore`
3. Onglet "Logs" pour voir les logs en temps réel

## Étape 5 : Configurer un Domain Personnalisé (Optionnel)

### Ajouter un Domain Personnel

1. Va dans les paramètres de ton service Render
2. Section "Custom Domains"
3. Clique "Add Custom Domain"
4. Entre ton domain (ex: `arouastore.com`)

### Configuration DNS chez ton Registrar

Selon ton registrar (GoDaddy, Namecheap, OVH, etc.), ajoute :

**Pour un subdomain (www.arouastore.com) :**
```
Type: CNAME
Name: www
Value: arouastore.onrender.com
TTL: Auto
```

**Pour le root domain (arouastore.com) :**
```
Type: ALIAS ou ANAME
Name: @
Value: arouastore.onrender.com
TTL: Auto
```

*Note : Certains registrars nécessitent un CNAME vers www et une redirection de @ vers www.*

### Activer HTTPS

Render configure automatiquement Let's Encrypt pour ton domain :
- Attends 5-30 minutes après la configuration DNS
- HTTPS sera activé automatiquement
- Certificat renouvelé automatiquement

## Continuous Deployment

Render déploie automatiquement à chaque push GitHub :

1. **Push sur main** → Déploiement en production (~2-5 minutes)
2. **Pull Requests** → Prévisualisation automatique
3. **Rollback** → Possible via Dashboard (Settings → Rollback)

Pour activer :
1. Va dans les paramètres de ton service
2. Active "Auto-Deploy from GitHub"
3. Configure la branche (généralement `main`)

## Dépannage Courant

### Erreur "502 Bad Gateway"

**Cause** : L'application ne démarre pas correctement

**Solutions** :
- Vérifie les logs pour les erreurs de démarrage
- Assure-toi que `npm run build` fonctionne localement
- Vérifie les variables d'environnement

```bash
# Tester le build localement
npm install
npm run build

# Tester le démarrage
npm run start:prod
```

### Erreur "Connection refused" Base de Données

**Cause** : Credentials TiDB incorrects ou non configurés

**Solutions** :
```bash
# Vérifier les variables dans Render Dashboard
# ou via CLI
render config list

# Tester la connexion depuis Render
curl https://arouastore.onrender.com/api/public/products
```

### Erreur "Module not found" lors du Build

**Cause** : Dépendances manquantes ou chemin incorrect

**Solutions** :
```bash
# Supprimer node_modules et reinstaller
rm -rf node_modules
npm install

# Vérifier package.json
cat package.json | grep -A 10 '"dependencies"'
```

### Frontend Charge mais API ne Fonctionne Pas

**Cause** : Backend non configuré pour servir les fichiers statiques

**Solutions** :
- Vérifie que le code pour servir `express.static` est bien présent dans `server.cjs`
- Assure-toi que `npm run build` génère bien le dossier `dist`

```bash
# Vérifier la structure du build
ls -la dist/
# Doit contenir index.html, assets/, etc.
```

### Application Trop Lente

**Cause** : Limites du plan gratuit (500MB RAM)

**Solutions** :
- Optimise les requêtes de base de données
- Cache les données fréquemment accédées
- Évite les opérations lourdes au démarrage

## Monitoring et Health Checks

### Health Endpoint

Laisse ton application accessible sur la route principale pour les health checks Render :

```javascript
// Dans server.cjs, ajoute cette route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now() 
  });
});
```

### Métriques

Render fournit :
- **CPU usage** en temps réel
- **Memory usage** (500MB max sur gratuit)
- **Request count**
- **Response times**

### Alertes

Configure des alertes dans Render Dashboard :
- CPU > 80% pendant 5 minutes
- Memory > 90%
- Response time > 10s
- Deployments failed

## Bonnes Pratiques de Production

### 1. Sécurité

```bash
# Changer les secrets par défaut en production
render config set SESSION_SECRET=$(openssl rand -base64 32)

# Rotation régulière des credentials TiDB via TiDB Cloud Console
```

### 2. Sauvegardes

TiDB Cloud gère automatiquement les sauvegardes :
- Vérifie les paramètres dans TiDB Cloud Console
- Configure un plan de rétention approprié
- Teste la restauration régulièrement

### 3. Monitoring

Utilise des outils externes si nécessaire :
- **UptimeRobot** : Monitoring gratuit (5min interval)
- **LogRocket** : Logs d'erreur JavaScript
- **Sentry** : Error tracking gratuit

### 4. Variables d'Environnement

Ne jamais commit les credentials :
```bash
# .gitignore
.env
.env.local
.env.production.local
```

### 5. Gestion des Erreurs

Améliore les messages d'erreur dans ton code :

```javascript
// Dans server.cjs
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  
  // En production, ne pas révéler les détails de l'erreur
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erreur serveur' 
      : err.message
  });
});
```

## Commandes Utiles Render

```bash
# Installation CLI
npm install -g @render/comugo

# Connexion
render login

# Déploiement
render deploy

# Gestion
render status          # Statut du service
render logs           # Logs en temps réel
render logs --tail    # Suivre les logs
render open           # Ouvrir dans navigateur
render shell          # Ouvrir un shell interactif

# Configuration
render config list    # Lister les variables
render config set KEY=VALUE  # Ajouter/modifier
render config unset KEY      # Supprimer

# Rollback
render rollback       # Revenir au déploiement précédent
```

## Alternatives Gratuitas Comparées

| Service | Compute | RAM | Stockage | DB Incluse | Continuous Deploy |
|---------|--------|-----|----------|------------|-------------------|
| **Render** | 750h/mois | 1GB | 1GB | PostgreSQL ✅ | ✅ GitHub |
| **Cyclic** | Illimité | 512MB | - | Non | ✅ GitHub |
| **Fly.io** | 3 VMs | 1GB | 3GB | SQLite ✅ | ✅ GitHub |
| **Railway** | 500h/mois | 1GB | 1GB | PostgreSQL ✅ | ✅ GitHub (plus gratuit) |

## Résumé Déploiement Render

```bash
# 1. Préparer le code (voir Étape 1)
# - Modifier server.cjs pour servir le frontend
# - Créer render.yaml
# - Ajouter start:prod dans package.json

# 2. Pusher sur GitHub
git add .
git commit -m "Prep for Render deployment"
git push origin main

# 3. Créer le service sur Render
# - https://dashboard.render.com
# - New Web Service → Connecter GitHub
# - Sélectionner repository arouastore

# 4. Configurer les variables d'environnement
DB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=2Kkkuv3PHyG2RBg.root
DB_PASSWORD=1fYFk5J50aTjVgcl
DB_NAME=POS
NODE_ENV=production
PORT=3000

# 5. Déployer et tester
# - Attendre la fin du build (~2-5 minutes)
# - Tester l'URL fournie par Render
# - Vérifier les API et le frontend

# 6. Configurer domain personnalisé (optionnel)
# - Settings → Custom Domains
# - Configurer DNS chez ton registrar
```

## Support et Ressources

- **Documentation Render** : https://render.com/docs
- **Guide Node.js** : https://render.com/docs/node
- **Support Render** : https://render.com/support
- **Status des services** : https://render.statuspage.io

## Félicitations !

Ton application ArouaStore devrait maintenant être accessible gratuitement sur :
```
https://arouastore.onrender.com
```

ou avec ton domain personnalisé si configuré. 🚀

L'application comprend :
- ✅ Frontend React optimisé et minifié
- ✅ Backend Express avec toutes les API fonctionnelles
- ✅ Base de données TiDB Cloud connectée
- ✅ Rapports (ventes, inventaire, caisse, réparations)
- ✅ Gestion des clients, produits, réparations
- ✅ Bons de commande fournisseurs
- ✅ Système de fidélité

Pour toute question ou problème, consulte la section "Dépannage" ci-dessus ou contacte le support Render.