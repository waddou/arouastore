import mysql from "mysql2/promise";

const config = {
  host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "2Kkkuv3PHyG2RBg.root",
  password: "1fYFk5J50aTjVgcl",
  database: "POS",
  ssl: { rejectUnauthorized: true },
};

async function migrate() {
  console.log("Connexion a TiDB Cloud...");
  const conn = await mysql.createConnection(config);
  console.log("Connecte!\n");

  const run = async (sql, desc) => {
    try {
      await conn.execute(sql);
      console.log("OK:", desc);
    } catch (err) {
      if (err.code === "ER_TABLE_EXISTS_ERROR" || err.code === "ER_DUP_ENTRY") {
        console.log("SKIP (existe):", desc);
      } else {
        console.log("ERREUR:", desc, "-", err.message);
      }
    }
  };

  // Desactiver FK checks
  await run("SET FOREIGN_KEY_CHECKS = 0", "Disable FK checks");

  // ========== CREATION DES TABLES (sans DEFAULT UNIX_TIMESTAMP) ==========

  await run(
    `CREATE TABLE IF NOT EXISTS es_system__auth_user (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    email_verified TINYINT(1) DEFAULT 0 NOT NULL,
    image TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    is_anonymous TINYINT(1) DEFAULT 0,
    __internal_a VARCHAR(255),
    banned TINYINT(1) DEFAULT 0,
    ban_reason TEXT,
    ban_expires BIGINT,
    last_login_at BIGINT,
    UNIQUE KEY es_system__auth_user_email_unique (email)
  )`,
    "Table es_system__auth_user",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS es_system__auth_account (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at BIGINT,
    refresh_token_expires_at BIGINT,
    scope TEXT,
    password VARCHAR(255),
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    KEY es_system__auth_account_userId_idx (user_id)
  )`,
    "Table es_system__auth_account",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS es_system__auth_session (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    expires_at BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    ip_address VARCHAR(255),
    user_agent TEXT,
    user_id VARCHAR(255) NOT NULL,
    impersonated_by VARCHAR(255),
    UNIQUE KEY es_system__auth_session_token_unique (token),
    KEY es_system__auth_session_userId_idx (user_id)
  )`,
    "Table es_system__auth_session",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS es_system__auth_verification (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    KEY es_system__auth_verification_identifier_idx (identifier)
  )`,
    "Table es_system__auth_verification",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS es_system__auth_config (
    \`key\` VARCHAR(255) PRIMARY KEY NOT NULL,
    data TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
    "Table es_system__auth_config",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS es_system__db_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
    "Table es_system__db_migrations",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('admin', 'manager', 'agent') NOT NULL DEFAULT 'agent',
    created_at BIGINT,
    KEY users_email_idx (email),
    KEY users_role_idx (role)
  )`,
    "Table users",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auth_user_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'agent',
    email VARCHAR(255),
    name VARCHAR(255),
    created_at BIGINT,
    UNIQUE KEY user_roles_unique_idx (auth_user_id),
    KEY user_roles_auth_user_idx (auth_user_id)
  )`,
    "Table user_roles",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS user_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    auth_user_id VARCHAR(255) NOT NULL,
    created_at BIGINT,
    KEY user_credentials_email_idx (email)
  )`,
    "Table user_credentials",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category ENUM('phone', 'accessory', 'component') NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    price_purchase INT NOT NULL DEFAULT 0,
    price_sale INT NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    alert_threshold INT NOT NULL DEFAULT 5,
    image_url TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at BIGINT,
    updated_at BIGINT,
    KEY products_sku_idx (sku),
    KEY products_category_idx (category),
    KEY products_stock_idx (stock)
  )`,
    "Table products",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    first_visit BIGINT,
    total_spent INT NOT NULL DEFAULT 0,
    created_at BIGINT,
    KEY customers_phone_idx (phone)
  )`,
    "Table customers",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    user_id INT NOT NULL,
    total INT NOT NULL DEFAULT 0,
    discount INT NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    status ENUM('completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'completed',
    created_at BIGINT,
    KEY sales_customer_idx (customer_id),
    KEY sales_user_idx (user_id),
    KEY sales_created_idx (created_at)
  )`,
    "Table sales",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price INT NOT NULL,
    subtotal INT NOT NULL,
    KEY sale_items_sale_idx (sale_id)
  )`,
    "Table sale_items",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS repairs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    device_brand VARCHAR(100) NOT NULL,
    device_model VARCHAR(100) NOT NULL,
    device_variant VARCHAR(100),
    device_password VARCHAR(255),
    physical_state TEXT,
    issue_description TEXT NOT NULL,
    diagnosis TEXT,
    status ENUM('new', 'diagnostic', 'repair', 'delivered') NOT NULL DEFAULT 'new',
    estimated_cost INT NOT NULL DEFAULT 0,
    final_cost INT,
    technician_id INT,
    promised_date BIGINT,
    delivered_at BIGINT,
    created_at BIGINT,
    updated_at BIGINT,
    KEY repairs_customer_idx (customer_id),
    KEY repairs_status_idx (status),
    KEY repairs_technician_idx (technician_id)
  )`,
    "Table repairs",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS repair_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repair_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price INT NOT NULL,
    created_at BIGINT,
    KEY repair_components_repair_idx (repair_id),
    KEY repair_components_product_idx (product_id)
  )`,
    "Table repair_components",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS cash_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    opening_amount INT NOT NULL DEFAULT 0,
    closing_amount INT,
    expected_amount INT,
    difference INT,
    opened_at BIGINT,
    closed_at BIGINT,
    notes TEXT,
    KEY cash_sessions_user_idx (user_id),
    KEY cash_sessions_opened_idx (opened_at)
  )`,
    "Table cash_sessions",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS device_brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at BIGINT,
    KEY device_brands_active_idx (is_active)
  )`,
    "Table device_brands",
  );

  await run(
    `CREATE TABLE IF NOT EXISTS device_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    variant VARCHAR(100),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at BIGINT,
    UNIQUE KEY device_models_brand_name_unique (brand_id, name),
    KEY device_models_brand_idx (brand_id),
    KEY device_models_active_idx (is_active)
  )`,
    "Table device_models",
  );

  console.log("\n========== INSERTION DES DONNEES ==========\n");

  const now = Date.now();
  const nowSec = Math.floor(now / 1000);

  // Utilisateurs systeme auth
  await run(
    `INSERT IGNORE INTO es_system__auth_user (id, name, email, email_verified, created_at, updated_at, is_anonymous, __internal_a, banned) VALUES
    ('es-admin-00000000-0000-0000-0000-000000000001', '_es_admin', '_es_admin@edge-spark.local', 1, 1769710250570, 1769710250570, 0, 'esa', 0),
    ('JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK', 'kuarigama', 'kuarigama@heure-salat.com', 0, 1769714198502, 1769856968021, 0, 'esu', 0)`,
    "Insert es_system__auth_user",
  );

  await run(
    `INSERT IGNORE INTO es_system__auth_account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES
    ('es-admin-account-00000000-0000-0001', '_es_admin@edge-spark.local', 'credential', 'es-admin-00000000-0000-0000-0000-000000000001', '\$2a\$10\$UNUSED_PASSWORD_PLACEHOLDER_FOR_ADMIN_USER', 1769710250570, 1769710250570),
    ('BN6ErIS6BZNW7WNHTZGwnefjp56v8DN3', 'JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK', 'credential', 'JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK', '6a64c0241483423e766f81c43de22b4d:6f5e478c3c4a7775f777fe5bd7437bd8079d0e4c5264750c27955e92450a28a621fea9e3ec249d4c05164c10bea9ba92deaf3f76bafdf869fcc93b58120f99aa', 1769714198714, 1769714198714)`,
    "Insert es_system__auth_account",
  );

  await run(
    `INSERT IGNORE INTO es_system__auth_config (\`key\`, data, created_at, updated_at) VALUES
    ('default', '{"disableSignUp":false,"enableAnonymous":false,"providerEmailPassword":{"enabled":true,"config":{"minPasswordLength":8,"requireEmailVerification":false,"requirePasswordResetEmailVerification":false,"revokeSessionsOnPasswordReset":false}},"providerGoogle":{"enabled":false,"config":{}}}', 1769712467403, 1769712467372)`,
    "Insert es_system__auth_config",
  );

  await run(
    `INSERT IGNORE INTO users (id, name, email, role, created_at) VALUES (1, 'Admin Test', 'admin@phonestore.fr', 'admin', 1769712993)`,
    "Insert users",
  );

  await run(
    `INSERT IGNORE INTO user_roles (auth_user_id, role, email, name, created_at) VALUES ('JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK', 'admin', 'kuarigama@heure-salat.com', 'kuarigama', ${nowSec})`,
    "Insert user_roles",
  );

  await run(
    `INSERT IGNORE INTO user_credentials (email, password, auth_user_id, created_at) VALUES ('kuarigama@heure-salat.com', 'Abbas@2025@Djerba', 'JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK', ${nowSec})`,
    "Insert user_credentials",
  );

  // Produits
  await run(
    `INSERT IGNORE INTO products (id, sku, name, category, brand, model, price_purchase, price_sale, stock, alert_threshold, is_active, created_at, updated_at) VALUES
    (1, 'IP15PRO-256', 'iPhone 15 Pro 256Go', 'phone', 'Apple', 'iPhone 15 Pro', 950, 1299, 8, 3, 1, 1769712984, 1769712984),
    (2, 'IP15-128', 'iPhone 15 128Go', 'phone', 'Apple', 'iPhone 15', 750, 999, 11, 5, 1, 1769712984, 1769712984),
    (3, 'SGS24U-256', 'Samsung Galaxy S24 Ultra', 'phone', 'Samsung', 'Galaxy S24 Ultra', 900, 1199, 6, 3, 1, 1769712984, 1769712984),
    (4, 'SGS24-128', 'Samsung Galaxy S24 128Go', 'phone', 'Samsung', 'Galaxy S24', 650, 899, 10, 5, 1, 1769712984, 1769712984),
    (5, 'XIA-RN12', 'Xiaomi Redmi Note 12', 'phone', 'Xiaomi', 'Redmi Note 12', 180, 299, 15, 5, 1, 1769712984, 1769712984),
    (6, 'PIX8-128', 'Google Pixel 8 128Go', 'phone', 'Google', 'Pixel 8', 550, 799, 5, 3, 1, 1769712984, 1769712984),
    (7, 'APP-PRO2', 'AirPods Pro 2', 'accessory', 'Apple', 'AirPods Pro', 180, 279, 20, 8, 1, 1769712984, 1769712984),
    (8, 'SGS-BUDS', 'Samsung Galaxy Buds2 Pro', 'accessory', 'Samsung', 'Galaxy Buds2 Pro', 120, 199, 15, 5, 1, 1769712984, 1769712984),
    (9, 'CHG-USB65W', 'Chargeur USB-C 65W', 'accessory', NULL, NULL, 15, 39, 50, 15, 1, 1769712984, 1769712984),
    (10, 'CHG-MG15W', 'Chargeur MagSafe 15W', 'accessory', 'Apple', 'MagSafe', 25, 49, 30, 10, 1, 1769712984, 1769712984),
    (11, 'COQ-IP15', 'Coque iPhone 15 Pro', 'accessory', NULL, 'iPhone 15 Pro', 8, 25, 40, 15, 1, 1769712984, 1769712984),
    (12, 'COQ-SGS24', 'Coque Samsung S24', 'accessory', NULL, 'Galaxy S24', 8, 25, 35, 15, 1, 1769712984, 1769712984),
    (13, 'ECR-IP15', 'Ecran iPhone 15 Pro', 'component', 'Apple', 'iPhone 15 Pro', 120, 0, 5, 2, 1, 1769712984, 1769712984),
    (14, 'ECR-IP14', 'Ecran iPhone 14', 'component', 'Apple', 'iPhone 14', 90, 0, 8, 3, 1, 1769712984, 1769712984),
    (15, 'BAT-IP15', 'Batterie iPhone 15', 'component', 'Apple', 'iPhone 15', 35, 0, 10, 5, 1, 1769712984, 1769712984),
    (16, 'BAT-SGS24', 'Batterie Samsung S24', 'component', 'Samsung', 'Galaxy S24', 30, 0, 8, 4, 1, 1769712984, 1769712984)`,
    "Insert products",
  );

  // Clients
  await run(
    `INSERT IGNORE INTO customers (id, phone, name, first_visit, total_spent, created_at) VALUES
    (1, '0612345678', 'Jean Dupont', 1769712966, 0, 1769712966),
    (2, '0698765432', 'Marie Martin', 1769712966, 0, 1769712966),
    (3, '0611223344', 'Pierre Leroy', 1769712966, 0, 1769712966),
    (4, '0655443322', 'Sophie Bernard', 1769712966, 0, 1769712966),
    (5, '0677889900', 'Lucas Moreau', 1769712966, 0, 1769712966)`,
    "Insert customers",
  );

  // Device brands
  await run(
    `INSERT IGNORE INTO device_brands (id, name, sort_order, created_at) VALUES
    (1, 'Apple', 1, ${nowSec}), (2, 'Samsung', 2, ${nowSec}), (3, 'Xiaomi', 3, ${nowSec}), (4, 'Huawei', 4, ${nowSec}), (5, 'Oppo', 5, ${nowSec}),
    (6, 'Vivo', 6, ${nowSec}), (7, 'OnePlus', 7, ${nowSec}), (8, 'Google', 8, ${nowSec}), (9, 'Realme', 9, ${nowSec}), (10, 'Motorola', 10, ${nowSec})`,
    "Insert device_brands",
  );

  // Device models - Apple
  await run(
    `INSERT IGNORE INTO device_models (brand_id, name, sort_order, created_at) VALUES
    (1, 'iPhone 15 Pro Max', 1, ${nowSec}), (1, 'iPhone 15 Pro', 2, ${nowSec}), (1, 'iPhone 15 Plus', 3, ${nowSec}), (1, 'iPhone 15', 4, ${nowSec}),
    (1, 'iPhone 14 Pro Max', 5, ${nowSec}), (1, 'iPhone 14 Pro', 6, ${nowSec}), (1, 'iPhone 14', 7, ${nowSec}), (1, 'iPhone 13', 8, ${nowSec}),
    (1, 'iPhone 12', 9, ${nowSec}), (1, 'iPhone SE', 10, ${nowSec})`,
    "Insert device_models Apple",
  );

  // Device models - Samsung
  await run(
    `INSERT IGNORE INTO device_models (brand_id, name, sort_order, created_at) VALUES
    (2, 'Galaxy S24 Ultra', 1, ${nowSec}), (2, 'Galaxy S24+', 2, ${nowSec}), (2, 'Galaxy S24', 3, ${nowSec}), (2, 'Galaxy S23 Ultra', 4, ${nowSec}),
    (2, 'Galaxy S23', 5, ${nowSec}), (2, 'Galaxy Z Fold 5', 6, ${nowSec}), (2, 'Galaxy Z Flip 5', 7, ${nowSec}), (2, 'Galaxy A54', 8, ${nowSec}),
    (2, 'Galaxy A34', 9, ${nowSec}), (2, 'Galaxy A14', 10, ${nowSec})`,
    "Insert device_models Samsung",
  );

  // Device models - Xiaomi
  await run(
    `INSERT IGNORE INTO device_models (brand_id, name, sort_order, created_at) VALUES
    (3, 'Xiaomi 14 Ultra', 1, ${nowSec}), (3, 'Xiaomi 14 Pro', 2, ${nowSec}), (3, 'Xiaomi 14', 3, ${nowSec}), (3, 'Xiaomi 13T Pro', 4, ${nowSec}),
    (3, 'Xiaomi 13T', 5, ${nowSec}), (3, 'Redmi Note 13 Pro+', 6, ${nowSec}), (3, 'Redmi Note 13 Pro', 7, ${nowSec}), (3, 'Redmi Note 13', 8, ${nowSec}),
    (3, 'Redmi 13C', 9, ${nowSec}), (3, 'Poco X6 Pro', 10, ${nowSec})`,
    "Insert device_models Xiaomi",
  );

  // Reactiver FK checks
  await run("SET FOREIGN_KEY_CHECKS = 1", "Enable FK checks");

  // Verification finale
  console.log("\n========== VERIFICATION ==========\n");
  const [tables] = await conn.execute("SHOW TABLES");
  console.log("Tables creees (" + tables.length + "):");
  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [[countResult]] = await conn.execute(
      `SELECT COUNT(*) as c FROM \`${tableName}\``,
    );
    console.log(`  - ${tableName}: ${countResult.c} rows`);
  }

  await conn.end();
  console.log("\nMigration terminee avec succes!");
}

migrate().catch(console.error);
