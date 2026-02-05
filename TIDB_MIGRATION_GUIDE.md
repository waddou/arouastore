# Guide de Migration vers TiDB Cloud

## Fichier de migration

Le fichier `tidb_migration.sql` contient tout le schema et les donnees de la base de donnees ArouaStore, converti de SQLite vers MySQL/TiDB.

## Methode 1: Via TiDB Cloud Console

1. Connectez-vous a votre compte TiDB Cloud: https://tidbcloud.com
2. Selectionnez votre cluster
3. Allez dans "SQL Editor" ou "Chat2Query"
4. Copiez le contenu de `tidb_migration.sql` et executez-le

## Methode 2: Via MySQL CLI

```bash
mysql -h <TIDB_HOST> -P <PORT> -u <USERNAME> -p <DATABASE_NAME> < tidb_migration.sql
```

Remplacez:
- `<TIDB_HOST>`: L'hote de votre cluster TiDB (ex: gateway01.us-west-2.prod.aws.tidbcloud.com)
- `<PORT>`: Le port (generalement 4000)
- `<USERNAME>`: Votre nom d'utilisateur TiDB
- `<DATABASE_NAME>`: Le nom de la base de donnees cible

## Methode 3: Via MCP TiDB (si configure)

Si vous avez le serveur MCP TiDB configure, vous pouvez utiliser les commandes MCP pour executer les requetes.

## Structure de la base de donnees

### Tables principales:
- `users` - Utilisateurs de l'application
- `user_roles` - Roles des utilisateurs
- `user_credentials` - Credentials d'authentification locale
- `products` - Catalogue des produits (telephones, accessoires, composants)
- `customers` - Base de donnees clients
- `sales` - Transactions de vente
- `sale_items` - Articles des ventes
- `repairs` - Reparations d'appareils
- `repair_components` - Composants utilises dans les reparations
- `cash_sessions` - Sessions de caisse
- `device_brands` - Marques d'appareils
- `device_models` - Modeles d'appareils par marque

### Tables systeme (authentification EdgeSpark):
- `es_system__auth_user` - Utilisateurs authentifies
- `es_system__auth_account` - Comptes d'authentification
- `es_system__auth_session` - Sessions actives
- `es_system__auth_verification` - Verifications
- `es_system__auth_config` - Configuration auth
- `es_system__db_migrations` - Historique des migrations

## Donnees migrees

- 2 utilisateurs auth systeme
- 1 utilisateur application (admin)
- 16 produits (telephones, accessoires, composants)
- 5 clients
- 1 vente avec 1 article
- 5 reparations
- 2 sessions de caisse
- 10 marques d'appareils
- 100 modeles d'appareils (10 par marque)
