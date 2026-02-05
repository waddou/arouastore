-- ============================================
-- ArouaStore - Migration vers TiDB Cloud
-- Schema compatible MySQL/TiDB
-- ============================================

-- Desactiver les verifications de cles etrangeres temporairement
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- CREATION DES TABLES
-- ============================================

-- Table des utilisateurs systeme d'authentification
CREATE TABLE IF NOT EXISTS `es_system__auth_user` (
  `id` VARCHAR(255) PRIMARY KEY NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `email_verified` TINYINT(1) DEFAULT 0 NOT NULL,
  `image` TEXT,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000) NOT NULL,
  `updated_at` BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000) NOT NULL,
  `is_anonymous` TINYINT(1) DEFAULT 0,
  `__internal_a` VARCHAR(255),
  `banned` TINYINT(1) DEFAULT 0,
  `ban_reason` TEXT,
  `ban_expires` BIGINT,
  `last_login_at` BIGINT,
  UNIQUE KEY `es_system__auth_user_email_unique` (`email`)
);

-- Table des comptes d'authentification
CREATE TABLE IF NOT EXISTS `es_system__auth_account` (
  `id` VARCHAR(255) PRIMARY KEY NOT NULL,
  `account_id` VARCHAR(255) NOT NULL,
  `provider_id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `access_token` TEXT,
  `refresh_token` TEXT,
  `id_token` TEXT,
  `access_token_expires_at` BIGINT,
  `refresh_token_expires_at` BIGINT,
  `scope` TEXT,
  `password` VARCHAR(255),
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000) NOT NULL,
  `updated_at` BIGINT NOT NULL,
  KEY `es_system__auth_account_userId_idx` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `es_system__auth_user`(`id`) ON DELETE CASCADE
);

-- Table des sessions
CREATE TABLE IF NOT EXISTS `es_system__auth_session` (
  `id` VARCHAR(255) PRIMARY KEY NOT NULL,
  `expires_at` BIGINT NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000) NOT NULL,
  `updated_at` BIGINT NOT NULL,
  `ip_address` VARCHAR(255),
  `user_agent` TEXT,
  `user_id` VARCHAR(255) NOT NULL,
  `impersonated_by` VARCHAR(255),
  UNIQUE KEY `es_system__auth_session_token_unique` (`token`),
  KEY `es_system__auth_session_userId_idx` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `es_system__auth_user`(`id`) ON DELETE CASCADE
);

-- Table de verification
CREATE TABLE IF NOT EXISTS `es_system__auth_verification` (
  `id` VARCHAR(255) PRIMARY KEY NOT NULL,
  `identifier` VARCHAR(255) NOT NULL,
  `value` TEXT NOT NULL,
  `expires_at` BIGINT NOT NULL,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000) NOT NULL,
  `updated_at` BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000) NOT NULL,
  KEY `es_system__auth_verification_identifier_idx` (`identifier`)
);

-- Table de configuration auth
CREATE TABLE IF NOT EXISTS `es_system__auth_config` (
  `key` VARCHAR(255) PRIMARY KEY NOT NULL,
  `data` TEXT DEFAULT '{}',
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000) NOT NULL,
  `updated_at` BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000) NOT NULL
);

-- Table des migrations
CREATE TABLE IF NOT EXISTS `es_system__db_migrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) UNIQUE,
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table des utilisateurs de l'application
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `role` ENUM('admin', 'manager', 'agent') NOT NULL DEFAULT 'agent',
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  KEY `users_email_idx` (`email`),
  KEY `users_role_idx` (`role`)
);

-- Table des roles utilisateurs
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `auth_user_id` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'agent',
  `email` VARCHAR(255),
  `name` VARCHAR(255),
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  UNIQUE KEY `user_roles_unique_idx` (`auth_user_id`),
  KEY `user_roles_auth_user_idx` (`auth_user_id`)
);

-- Table des credentials utilisateur (auth locale)
CREATE TABLE IF NOT EXISTS `user_credentials` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `auth_user_id` VARCHAR(255) NOT NULL,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  KEY `user_credentials_email_idx` (`email`)
);

-- Table des produits
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sku` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `category` ENUM('phone', 'accessory', 'component') NOT NULL,
  `brand` VARCHAR(100),
  `model` VARCHAR(100),
  `price_purchase` INT NOT NULL DEFAULT 0,
  `price_sale` INT NOT NULL DEFAULT 0,
  `stock` INT NOT NULL DEFAULT 0,
  `alert_threshold` INT NOT NULL DEFAULT 5,
  `image_url` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  `updated_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  KEY `products_sku_idx` (`sku`),
  KEY `products_category_idx` (`category`),
  KEY `products_stock_idx` (`stock`)
);

-- Table des clients
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `first_visit` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  `total_spent` INT NOT NULL DEFAULT 0,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  KEY `customers_phone_idx` (`phone`)
);

-- Table des ventes
CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT,
  `user_id` INT NOT NULL,
  `total` INT NOT NULL DEFAULT 0,
  `discount` INT NOT NULL DEFAULT 0,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cash',
  `status` ENUM('completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'completed',
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  KEY `sales_customer_idx` (`customer_id`),
  KEY `sales_user_idx` (`user_id`),
  KEY `sales_created_idx` (`created_at`),
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- Table des articles de vente
CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` INT NOT NULL,
  `subtotal` INT NOT NULL,
  KEY `sale_items_sale_idx` (`sale_id`),
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);

-- Table des reparations
CREATE TABLE IF NOT EXISTS `repairs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `device_brand` VARCHAR(100) NOT NULL,
  `device_model` VARCHAR(100) NOT NULL,
  `device_variant` VARCHAR(100),
  `device_password` VARCHAR(255),
  `physical_state` TEXT,
  `issue_description` TEXT NOT NULL,
  `diagnosis` TEXT,
  `status` ENUM('new', 'diagnostic', 'repair', 'delivered') NOT NULL DEFAULT 'new',
  `estimated_cost` INT NOT NULL DEFAULT 0,
  `final_cost` INT,
  `technician_id` INT,
  `promised_date` BIGINT,
  `delivered_at` BIGINT,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  `updated_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  KEY `repairs_customer_idx` (`customer_id`),
  KEY `repairs_status_idx` (`status`),
  KEY `repairs_technician_idx` (`technician_id`),
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
  FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`)
);

-- Table des composants de reparation
CREATE TABLE IF NOT EXISTS `repair_components` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `repair_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` INT NOT NULL,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  KEY `repair_components_repair_idx` (`repair_id`),
  KEY `repair_components_product_idx` (`product_id`),
  FOREIGN KEY (`repair_id`) REFERENCES `repairs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);

-- Table des sessions de caisse
CREATE TABLE IF NOT EXISTS `cash_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `opening_amount` INT NOT NULL DEFAULT 0,
  `closing_amount` INT,
  `expected_amount` INT,
  `difference` INT,
  `opened_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  `closed_at` BIGINT,
  `notes` TEXT,
  KEY `cash_sessions_user_idx` (`user_id`),
  KEY `cash_sessions_opened_idx` (`opened_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- Table des marques d'appareils
CREATE TABLE IF NOT EXISTS `device_brands` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `logo_url` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  KEY `device_brands_active_idx` (`is_active`)
);

-- Table des modeles d'appareils
CREATE TABLE IF NOT EXISTS `device_models` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `brand_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `variant` VARCHAR(100),
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` BIGINT DEFAULT (UNIX_TIMESTAMP()),
  UNIQUE KEY `device_models_brand_name_unique` (`brand_id`, `name`),
  KEY `device_models_brand_idx` (`brand_id`),
  KEY `device_models_active_idx` (`is_active`),
  FOREIGN KEY (`brand_id`) REFERENCES `device_brands`(`id`) ON DELETE CASCADE
);

-- ============================================
-- INSERTION DES DONNEES
-- ============================================

-- Utilisateurs systeme auth
INSERT INTO `es_system__auth_user` (`id`, `name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`, `is_anonymous`, `__internal_a`, `banned`, `ban_reason`, `ban_expires`, `last_login_at`) VALUES
('es-admin-00000000-0000-0000-0000-000000000001', '_es_admin', '_es_admin@edge-spark.local', 1, NULL, 1769710250570, 1769710250570, 0, 'esa', 0, NULL, NULL, NULL),
('JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK', 'kuarigama', 'kuarigama@heure-salat.com', 0, NULL, 1769714198502, 1769856968021, 0, 'esu', 0, NULL, NULL, 1769856968021);

-- Comptes auth
INSERT INTO `es_system__auth_account` (`id`, `account_id`, `provider_id`, `user_id`, `access_token`, `refresh_token`, `id_token`, `access_token_expires_at`, `refresh_token_expires_at`, `scope`, `password`, `created_at`, `updated_at`) VALUES
('es-admin-account-00000000-0000-0001', '_es_admin@edge-spark.local', 'credential', 'es-admin-00000000-0000-0000-0000-000000000001', NULL, NULL, NULL, NULL, NULL, NULL, '$2a$10$UNUSED_PASSWORD_PLACEHOLDER_FOR_ADMIN_USER', 1769710250570, 1769710250570),
('BN6ErIS6BZNW7WNHTZGwnefjp56v8DN3', 'JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK', 'credential', 'JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK', NULL, NULL, NULL, NULL, NULL, NULL, '6a64c0241483423e766f81c43de22b4d:6f5e478c3c4a7775f777fe5bd7437bd8079d0e4c5264750c27955e92450a28a621fea9e3ec249d4c05164c10bea9ba92deaf3f76bafdf869fcc93b58120f99aa', 1769714198714, 1769714198714);

-- Configuration auth
INSERT INTO `es_system__auth_config` (`key`, `data`, `created_at`, `updated_at`) VALUES
('default', '{"disableSignUp":false,"enableAnonymous":false,"providerEmailPassword":{"enabled":true,"config":{"minPasswordLength":8,"requireEmailVerification":false,"requirePasswordResetEmailVerification":false,"revokeSessionsOnPasswordReset":false}},"providerGoogle":{"enabled":false,"config":{}}}', 1769712467403, 1769712467372);

-- Migrations
INSERT INTO `es_system__db_migrations` (`id`, `name`, `applied_at`) VALUES
(1, '0000_lazy_menace.sql', '2026-01-29 18:10:49');

-- Utilisateurs application
INSERT INTO `users` (`id`, `name`, `email`, `role`, `created_at`) VALUES
(1, 'Admin Test', 'admin@phonestore.fr', 'admin', 1769712993);

-- Roles utilisateurs
INSERT INTO `user_roles` (`auth_user_id`, `role`, `email`, `name`) VALUES
('JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK', 'admin', 'kuarigama@heure-salat.com', 'kuarigama');

-- Produits
INSERT INTO `products` (`id`, `sku`, `name`, `category`, `brand`, `model`, `price_purchase`, `price_sale`, `stock`, `alert_threshold`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'IP15PRO-256', 'iPhone 15 Pro 256Go', 'phone', 'Apple', 'iPhone 15 Pro', 950, 1299, 8, 3, NULL, 1, 1769712984, 1769712984),
(2, 'IP15-128', 'iPhone 15 128Go', 'phone', 'Apple', 'iPhone 15', 750, 999, 11, 5, NULL, 1, 1769712984, 1769712984),
(3, 'SGS24U-256', 'Samsung Galaxy S24 Ultra', 'phone', 'Samsung', 'Galaxy S24 Ultra', 900, 1199, 6, 3, NULL, 1, 1769712984, 1769712984),
(4, 'SGS24-128', 'Samsung Galaxy S24 128Go', 'phone', 'Samsung', 'Galaxy S24', 650, 899, 10, 5, NULL, 1, 1769712984, 1769712984),
(5, 'XIA-RN12', 'Xiaomi Redmi Note 12', 'phone', 'Xiaomi', 'Redmi Note 12', 180, 299, 15, 5, NULL, 1, 1769712984, 1769712984),
(6, 'PIX8-128', 'Google Pixel 8 128Go', 'phone', 'Google', 'Pixel 8', 550, 799, 5, 3, NULL, 1, 1769712984, 1769712984),
(7, 'APP-PRO2', 'AirPods Pro 2', 'accessory', 'Apple', 'AirPods Pro', 180, 279, 20, 8, NULL, 1, 1769712984, 1769712984),
(8, 'SGS-BUDS', 'Samsung Galaxy Buds2 Pro', 'accessory', 'Samsung', 'Galaxy Buds2 Pro', 120, 199, 15, 5, NULL, 1, 1769712984, 1769712984),
(9, 'CHG-USB65W', 'Chargeur USB-C 65W', 'accessory', NULL, NULL, 15, 39, 50, 15, NULL, 1, 1769712984, 1769712984),
(10, 'CHG-MG15W', 'Chargeur MagSafe 15W', 'accessory', 'Apple', 'MagSafe', 25, 49, 30, 10, NULL, 1, 1769712984, 1769712984),
(11, 'COQ-IP15', 'Coque iPhone 15 Pro', 'accessory', NULL, 'iPhone 15 Pro', 8, 25, 40, 15, NULL, 1, 1769712984, 1769712984),
(12, 'COQ-SGS24', 'Coque Samsung S24', 'accessory', NULL, 'Galaxy S24', 8, 25, 35, 15, NULL, 1, 1769712984, 1769712984),
(13, 'ECR-IP15', 'Ecran iPhone 15 Pro', 'component', 'Apple', 'iPhone 15 Pro', 120, 0, 5, 2, NULL, 1, 1769712984, 1769712984),
(14, 'ECR-IP14', 'Ecran iPhone 14', 'component', 'Apple', 'iPhone 14', 90, 0, 8, 3, NULL, 1, 1769712984, 1769712984),
(15, 'BAT-IP15', 'Batterie iPhone 15', 'component', 'Apple', 'iPhone 15', 35, 0, 10, 5, NULL, 1, 1769712984, 1769712984),
(16, 'BAT-SGS24', 'Batterie Samsung S24', 'component', 'Samsung', 'Galaxy S24', 30, 0, 8, 4, NULL, 1, 1769712984, 1769712984);

-- Clients
INSERT INTO `customers` (`id`, `phone`, `name`, `first_visit`, `total_spent`, `created_at`) VALUES
(1, '0612345678', 'Jean Dupont', 1769712966, 0, 1769712966),
(2, '0698765432', 'Marie Martin', 1769712966, 0, 1769712966),
(3, '0611223344', 'Pierre Leroy', 1769712966, 0, 1769712966),
(4, '0655443322', 'Sophie Bernard', 1769712966, 0, 1769712966),
(5, '0677889900', 'Lucas Moreau', 1769712966, 0, 1769712966);

-- Ventes
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `total`, `discount`, `payment_method`, `status`, `created_at`) VALUES
(1, NULL, 1, 979, 20, 'card', 'completed', 1769718493);

-- Articles de vente
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `subtotal`) VALUES
(1, 1, 2, 1, 999, 999);

-- Reparations
INSERT INTO `repairs` (`id`, `customer_id`, `device_brand`, `device_model`, `device_variant`, `device_password`, `physical_state`, `issue_description`, `diagnosis`, `status`, `estimated_cost`, `final_cost`, `technician_id`, `promised_date`, `delivered_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'Apple', 'iPhone 13', NULL, NULL, NULL, 'Ecran casse suite a une chute', NULL, 'delivered', 180, NULL, NULL, NULL, 1769717713, 1769713003, 1769717713),
(2, 2, 'Samsung', 'Galaxy S22', NULL, NULL, NULL, 'Batterie qui ne tient plus la charge', NULL, 'diagnostic', 90, NULL, NULL, NULL, NULL, 1769713003, 1769713003),
(3, 3, 'Xiaomi', 'Redmi Note 12', NULL, NULL, NULL, 'Ne charge plus, connecteur defaillant', NULL, 'new', 50, NULL, NULL, NULL, NULL, 1769713003, 1769713003),
(4, 4, 'Apple', 'iPhone 14 Pro', NULL, NULL, NULL, 'Camera arriere floue', NULL, 'new', 150, NULL, NULL, NULL, NULL, 1769713003, 1769713003),
(5, 5, 'Google', 'Pixel 7', NULL, NULL, NULL, 'Ecran avec lignes vertes', NULL, 'diagnostic', 200, NULL, NULL, NULL, NULL, 1769713003, 1769713003);

-- Sessions de caisse
INSERT INTO `cash_sessions` (`id`, `user_id`, `opening_amount`, `closing_amount`, `expected_amount`, `difference`, `opened_at`, `closed_at`, `notes`) VALUES
(1, 1, 50, 50, 50, 0, 1769717698, 1769718060, NULL),
(2, 1, 50, 0, 50, -50, 1769719212, 1769763915, NULL);

-- Marques d'appareils
INSERT INTO `device_brands` (`id`, `name`, `sort_order`) VALUES
(1, 'Apple', 1),
(2, 'Samsung', 2),
(3, 'Xiaomi', 3),
(4, 'Huawei', 4),
(5, 'Oppo', 5),
(6, 'Vivo', 6),
(7, 'OnePlus', 7),
(8, 'Google', 8),
(9, 'Realme', 9),
(10, 'Motorola', 10);

-- Modeles Apple
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(1, 'iPhone 15 Pro Max', 1),
(1, 'iPhone 15 Pro', 2),
(1, 'iPhone 15 Plus', 3),
(1, 'iPhone 15', 4),
(1, 'iPhone 14 Pro Max', 5),
(1, 'iPhone 14 Pro', 6),
(1, 'iPhone 14', 7),
(1, 'iPhone 13', 8),
(1, 'iPhone 12', 9),
(1, 'iPhone SE', 10);

-- Modeles Samsung
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(2, 'Galaxy S24 Ultra', 1),
(2, 'Galaxy S24+', 2),
(2, 'Galaxy S24', 3),
(2, 'Galaxy S23 Ultra', 4),
(2, 'Galaxy S23', 5),
(2, 'Galaxy Z Fold 5', 6),
(2, 'Galaxy Z Flip 5', 7),
(2, 'Galaxy A54', 8),
(2, 'Galaxy A34', 9),
(2, 'Galaxy A14', 10);

-- Modeles Xiaomi
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(3, 'Xiaomi 14 Ultra', 1),
(3, 'Xiaomi 14 Pro', 2),
(3, 'Xiaomi 14', 3),
(3, 'Xiaomi 13T Pro', 4),
(3, 'Xiaomi 13T', 5),
(3, 'Redmi Note 13 Pro+', 6),
(3, 'Redmi Note 13 Pro', 7),
(3, 'Redmi Note 13', 8),
(3, 'Redmi 13C', 9),
(3, 'Poco X6 Pro', 10);

-- Modeles Huawei
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(4, 'Mate 60 Pro+', 1),
(4, 'Mate 60 Pro', 2),
(4, 'Mate 60', 3),
(4, 'P60 Pro', 4),
(4, 'P60', 5),
(4, 'Nova 12 Ultra', 6),
(4, 'Nova 12 Pro', 7),
(4, 'Nova 12', 8),
(4, 'Nova 11', 9),
(4, 'Y90', 10);

-- Modeles Oppo
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(5, 'Find X7 Ultra', 1),
(5, 'Find X7 Pro', 2),
(5, 'Find X7', 3),
(5, 'Find N3 Flip', 4),
(5, 'Reno 11 Pro', 5),
(5, 'Reno 11', 6),
(5, 'Reno 10 Pro+', 7),
(5, 'A98', 8),
(5, 'A78', 9),
(5, 'A58', 10);

-- Modeles Vivo
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(6, 'X100 Pro', 1),
(6, 'X100', 2),
(6, 'X90 Pro+', 3),
(6, 'V30 Pro', 4),
(6, 'V30', 5),
(6, 'V29 Pro', 6),
(6, 'V29', 7),
(6, 'Y100', 8),
(6, 'Y36', 9),
(6, 'Y27', 10);

-- Modeles OnePlus
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(7, 'OnePlus 12', 1),
(7, 'OnePlus 12R', 2),
(7, 'OnePlus Open', 3),
(7, 'OnePlus 11', 4),
(7, 'OnePlus 11R', 5),
(7, 'OnePlus Nord 3', 6),
(7, 'OnePlus Nord CE 3', 7),
(7, 'OnePlus Nord N30', 8),
(7, 'OnePlus Ace 3', 9),
(7, 'OnePlus Ace 2 Pro', 10);

-- Modeles Google
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(8, 'Pixel 8 Pro', 1),
(8, 'Pixel 8', 2),
(8, 'Pixel 8a', 3),
(8, 'Pixel Fold', 4),
(8, 'Pixel 7 Pro', 5),
(8, 'Pixel 7', 6),
(8, 'Pixel 7a', 7),
(8, 'Pixel 6 Pro', 8),
(8, 'Pixel 6', 9),
(8, 'Pixel 6a', 10);

-- Modeles Realme
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(9, 'GT 5 Pro', 1),
(9, 'GT 5', 2),
(9, 'GT 3', 3),
(9, 'GT Neo 5', 4),
(9, '12 Pro+', 5),
(9, '12 Pro', 6),
(9, '12', 7),
(9, 'C67', 8),
(9, 'C55', 9),
(9, 'Narzo 60 Pro', 10);

-- Modeles Motorola
INSERT INTO `device_models` (`brand_id`, `name`, `sort_order`) VALUES
(10, 'Edge 40 Pro', 1),
(10, 'Edge 40 Neo', 2),
(10, 'Edge 40', 3),
(10, 'Razr 40 Ultra', 4),
(10, 'Razr 40', 5),
(10, 'Moto G84', 6),
(10, 'Moto G73', 7),
(10, 'Moto G54', 8),
(10, 'Moto G34', 9),
(10, 'Moto G14', 10);

-- Reactiver les verifications de cles etrangeres
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
