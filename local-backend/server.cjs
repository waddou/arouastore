const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;

// TiDB Cloud connection configuration
const dbConfig = {
  host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "2Kkkuv3PHyG2RBg.root",
  password: "1fYFk5J50aTjVgcl",
  database: "POS",
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

let pool;

// Gestion des erreurs non capturees pour eviter les crashes
process.on("uncaughtException", (err) => {
  console.error("[SERVER] Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[SERVER] Unhandled Rejection at:", promise, "reason:", reason);
});

// Garder le processus en vie
process.on("SIGINT", async () => {
  console.log("\n[SERVER] Received SIGINT. Shutting down gracefully...");
  if (pool) await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[SERVER] Received SIGTERM. Shutting down gracefully...");
  if (pool) await pool.end();
  process.exit(0);
});

// Middleware
app.use(cors());
app.use(express.json());
// === SERVIR LE FRONTEND EN PRODUCTION ===
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../dist');
  app.use(express.static(buildPath));
}


// Initialize database connection pool
async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    // Test connection
    const connection = await pool.getConnection();
    console.log("Connected to TiDB Cloud successfully!");
    connection.release();

    // Run additive migrations for new feature tables
    await runMigrations();

    return true;
  } catch (error) {
    console.error("Failed to connect to TiDB:", error.message);
    process.exit(1);
  }
}

async function runMigrations() {
  // Use pool.query() instead of pool.execute() for DDL statements —
  // mysql2's execute() uses prepared statements which TiDB/MySQL may
  // not support for CREATE TABLE / ALTER TABLE.
  // Each migration is wrapped in its own try/catch so one failure
  // does not block the rest.
  const migrations = [
    {
      name: "notifications",
      sql: `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        user_id INTEGER,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        is_read TINYINT NOT NULL DEFAULT 0,
        created_at INTEGER,
        INDEX idx_notifications_user_id (user_id),
        INDEX idx_notifications_is_read (is_read),
        INDEX idx_notifications_created_at (created_at)
      )`,
    },
    {
      name: "suppliers",
      sql: `CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        email VARCHAR(255),
        address TEXT,
        notes TEXT,
        is_active TINYINT NOT NULL DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER,
        INDEX idx_suppliers_is_active (is_active)
      )`,
    },
    {
      name: "purchase_orders",
      sql: `CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_id INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        total_amount INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        ordered_at INTEGER,
        received_at INTEGER,
        created_by VARCHAR(100) NOT NULL,
        created_at INTEGER,
        updated_at INTEGER,
        INDEX idx_purchase_orders_supplier_id (supplier_id),
        INDEX idx_purchase_orders_status (status),
        INDEX idx_purchase_orders_ordered_at (ordered_at)
      )`,
    },
    {
      name: "purchase_order_items",
      sql: `CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        purchase_order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity_ordered INTEGER NOT NULL,
        quantity_received INTEGER NOT NULL DEFAULT 0,
        unit_price INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        INDEX idx_purchase_order_items_order_id (purchase_order_id)
      )`,
    },
    {
      name: "loyalty_transactions",
      sql: `CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        customer_id INTEGER NOT NULL,
        sale_id INTEGER,
        points INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at INTEGER,
        INDEX idx_loyalty_transactions_customer_id (customer_id),
        INDEX idx_loyalty_transactions_sale_id (sale_id)
      )`,
    },
    {
      name: "app_config",
      sql: `CREATE TABLE IF NOT EXISTS app_config (
        config_key VARCHAR(100) PRIMARY KEY,
        config_value TEXT NOT NULL
      )`,
    },
  ];

  let failedCount = 0;
  for (const migration of migrations) {
    try {
      await pool.query(migration.sql);
      console.log(`Migration OK: ${migration.name}`);
    } catch (error) {
      failedCount++;
      console.error(`Migration FAILED [${migration.name}]:`, error.message);
    }
  }

  // T009: Add loyalty_points column to customers table
  try {
    await pool.query(`
      ALTER TABLE customers ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0
    `);
    console.log("Migration OK: customers.loyalty_points column added");
  } catch (err) {
    if (err.message.includes("Duplicate column")) {
      console.log("Migration OK: customers.loyalty_points column already exists");
    } else {
      failedCount++;
      console.error("Migration FAILED [customers.loyalty_points]:", err.message);
    }
  }

  // T010: Change created_by from INTEGER to VARCHAR(100) for UUID support
  try {
    await pool.query(`
      ALTER TABLE purchase_orders MODIFY COLUMN created_by VARCHAR(100) NOT NULL
    `);
    console.log("Migration OK: purchase_orders.created_by changed to VARCHAR(100)");
  } catch (err) {
    if (err.message.includes("Duplicate column") || err.message.includes("doesn't exist")) {
      console.log("Migration OK: purchase_orders.created_by already VARCHAR or table doesn't exist yet");
    } else {
      failedCount++;
      console.error("Migration FAILED [purchase_orders.created_by]:", err.message);
    }
  }

  // Seed default loyalty settings if not present
  try {
    await pool.query(`
      INSERT IGNORE INTO app_config (config_key, config_value)
      VALUES ('loyalty_settings', '{"enabled":true,"pointsPerUnit":1,"pointsToCurrency":100}')
    `);
  } catch (err) {
    // safe to ignore — app_config table may have failed
  }

  if (failedCount > 0) {
    console.error(`Database migrations: ${failedCount} migration(s) failed — check errors above`);
  } else {
    console.log("Database migrations completed successfully");
  }
}

// ===========================================
// HELPER: Get current user from header (simplified auth)
// ===========================================
function getCurrentUser(req) {
  const authUserId =
    req.headers["x-auth-user-id"] || "JuL5vmdvmHbGggT0xUHJw3pMw5ZbqBUK";
  const email = req.headers["x-auth-email"] || "kuarigama@heure-salat.com";
  const name = req.headers["x-auth-name"] || "kuarigama";
  return { id: authUserId, email, name };
}

async function isAdmin(authUserId) {
  const [rows] = await pool.execute(
    "SELECT role FROM user_roles WHERE auth_user_id = ?",
    [authUserId],
  );
  return rows.length > 0 && rows[0].role === "admin";
}

// ===========================================
// AUTHENTICATION ENDPOINTS
// ===========================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    // Check credentials
    const [creds] = await pool.execute(
      "SELECT * FROM user_credentials WHERE email = ?",
      [email.toLowerCase()],
    );

    if (creds.length === 0 || creds[0].password !== password) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const cred = creds[0];

    // Get user role
    const [roles] = await pool.execute(
      "SELECT * FROM user_roles WHERE auth_user_id = ?",
      [cred.auth_user_id],
    );
    const userRole = roles[0];

    res.json({
      success: true,
      data: {
        id: cred.auth_user_id,
        email: cred.email,
        name: userRole?.name || cred.email.split("@")[0],
        role: userRole?.role || "agent",
      },
    });
  } catch (error) {
    console.error("[API] POST /api/auth/login - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Create user credentials when adding a user (called by admin)
app.post("/api/admin/users/credentials", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!(await isAdmin(user.id))) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }

    const { email, password, authUserId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    // Check if already exists
    const [existing] = await pool.execute(
      "SELECT * FROM user_credentials WHERE email = ?",
      [email.toLowerCase()],
    );

    if (existing.length > 0) {
      // Update password
      await pool.execute(
        "UPDATE user_credentials SET password = ? WHERE email = ?",
        [password, email.toLowerCase()],
      );
    } else {
      // Create new
      const id = authUserId || `user_${Date.now()}`;
      await pool.execute(
        "INSERT INTO user_credentials (email, password, auth_user_id) VALUES (?, ?, ?)",
        [email.toLowerCase(), password, id],
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[API] POST /api/admin/users/credentials - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Change own password (any authenticated user)
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Mot de passe actuel et nouveau requis" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    // Verify current password
    const [creds] = await pool.execute(
      "SELECT * FROM user_credentials WHERE auth_user_id = ?",
      [user.id],
    );

    if (creds.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    if (creds[0].password !== currentPassword) {
      return res.status(401).json({ error: "Mot de passe actuel incorrect" });
    }

    // Update password
    await pool.execute(
      "UPDATE user_credentials SET password = ? WHERE auth_user_id = ?",
      [newPassword, user.id],
    );

    res.json({ success: true, message: "Mot de passe modifié avec succès" });
  } catch (error) {
    console.error("[API] POST /api/auth/change-password - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Update own profile (name)
app.put("/api/auth/profile", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { name } = req.body;

    if (name) {
      await pool.execute(
        "UPDATE user_roles SET name = ? WHERE auth_user_id = ?",
        [name, user.id],
      );
    }

    const [roles] = await pool.execute(
      "SELECT * FROM user_roles WHERE auth_user_id = ?",
      [user.id],
    );
    const userRole = roles[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: userRole?.name || name || user.email.split("@")[0],
        role: userRole?.role || "agent",
      },
    });
  } catch (error) {
    console.error("[API] PUT /api/auth/profile - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// USER ROLES ENDPOINTS
// ===========================================

app.get("/api/me/role", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const [rows] = await pool.execute(
      "SELECT * FROM user_roles WHERE auth_user_id = ?",
      [user.id],
    );
    const result = rows[0];
    const role = result ? result.role : "agent";
    res.json({
      data: { role, userId: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("[API] GET /api/me/role - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!(await isAdmin(user.id))) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    const [roles] = await pool.execute(
      "SELECT * FROM user_roles ORDER BY created_at DESC",
    );
    // Convert snake_case to camelCase for frontend
    const formattedRoles = roles.map((r) => ({
      id: r.id,
      authUserId: r.auth_user_id,
      role: r.role,
      email: r.email || "",
      name: r.name || "",
      createdAt: r.created_at,
    }));
    res.json({ data: formattedRoles });
  } catch (error) {
    console.error("[API] GET /api/admin/users - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/admin/users", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!(await isAdmin(user.id))) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    const { email, role, name } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: "Email et rôle sont requis" });
    }
    const pendingUserId = `pending_${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const [result] = await pool.execute(
      "INSERT INTO user_roles (auth_user_id, role, email, name) VALUES (?, ?, ?, ?)",
      [pendingUserId, role, email.toLowerCase(), name || null],
    );
    const now = Math.floor(Date.now() / 1000);
    res.json({
      success: true,
      data: {
        id: result.insertId,
        authUserId: pendingUserId,
        role,
        email: email.toLowerCase(),
        name: name || "",
        createdAt: now,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/admin/users - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/admin/users/role", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!(await isAdmin(user.id))) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    const { authUserId, role } = req.body;
    const [existing] = await pool.execute(
      "SELECT * FROM user_roles WHERE auth_user_id = ?",
      [authUserId],
    );
    if (existing.length > 0) {
      await pool.execute(
        "UPDATE user_roles SET role = ? WHERE auth_user_id = ?",
        [role, authUserId],
      );
    } else {
      await pool.execute(
        "INSERT INTO user_roles (auth_user_id, role) VALUES (?, ?)",
        [authUserId, role],
      );
    }
    res.json({ success: true, data: { authUserId, role } });
  } catch (error) {
    console.error("[API] POST /api/admin/users/role - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/api/admin/users/:authUserId", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!(await isAdmin(user.id))) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    const { authUserId } = req.params;
    await pool.execute("DELETE FROM user_roles WHERE auth_user_id = ?", [
      authUserId,
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/admin/users - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// PRODUCTS ENDPOINTS
// ===========================================

app.get("/api/public/products", async (req, res) => {
  try {
    const { category, search, lowStock } = req.query;
    let sql = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }
    if (search) {
      sql += " AND name LIKE ?";
      params.push(`%${search}%`);
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.execute(sql, params);
    let products = rows;

    if (lowStock === "true") {
      products = products.filter((p) => p.stock <= p.alert_threshold);
    }

    // Convert snake_case to camelCase for frontend compatibility
    products = products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      brand: p.brand,
      model: p.model,
      pricePurchase: p.price_purchase,
      priceSale: p.price_sale,
      stock: p.stock,
      alertThreshold: p.alert_threshold,
      imageUrl: p.image_url,
      isActive: p.is_active,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    res.json({ data: products });
  } catch (error) {
    console.error("[API] GET /api/public/products - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }
    const product = rows[0];
    res.json({
      data: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        brand: product.brand,
        model: product.model,
        pricePurchase: product.price_purchase,
        priceSale: product.price_sale,
        stock: product.stock,
        alertThreshold: product.alert_threshold,
        imageUrl: product.image_url,
        isActive: product.is_active,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/products/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const {
      sku,
      name,
      category,
      brand,
      model,
      pricePurchase,
      priceSale,
      stock,
      alertThreshold,
      imageUrl,
    } = req.body;
    if (!name || !sku || !category) {
      return res
        .status(400)
        .json({ error: "Nom, SKU et catégorie sont requis" });
    }
    if (
      priceSale !== undefined &&
      pricePurchase !== undefined &&
      priceSale < pricePurchase
    ) {
      return res.status(400).json({
        error: "Le prix de vente doit être supérieur ou égal au prix d'achat",
      });
    }
    const [result] = await pool.execute(
      `INSERT INTO products (sku, name, category, brand, model, price_purchase, price_sale, stock, alert_threshold, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        sku,
        name,
        category,
        brand || null,
        model || null,
        pricePurchase || 0,
        priceSale || 0,
        stock || 0,
        alertThreshold || 5,
        imageUrl || null,
      ],
    );
    const [rows] = await pool.execute("SELECT * FROM products WHERE id = ?", [
      result.insertId,
    ]);
    const product = rows[0];
    res.status(201).json({
      data: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        brand: product.brand,
        model: product.model,
        pricePurchase: product.price_purchase,
        priceSale: product.price_sale,
        stock: product.stock,
        alertThreshold: product.alert_threshold,
        imageUrl: product.image_url,
        isActive: product.is_active,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/products - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = Math.floor(Date.now() / 1000);

    // Validation: prix de vente >= prix d'achat
    if (
      updates.priceSale !== undefined ||
      updates.pricePurchase !== undefined
    ) {
      const [current] = await pool.execute(
        "SELECT price_purchase, price_sale FROM products WHERE id = ?",
        [id],
      );
      if (current.length > 0) {
        const newPurchase =
          updates.pricePurchase !== undefined
            ? updates.pricePurchase
            : current[0].price_purchase;
        const newSale =
          updates.priceSale !== undefined
            ? updates.priceSale
            : current[0].price_sale;
        if (newSale < newPurchase) {
          return res.status(400).json({
            error:
              "Le prix de vente doit être supérieur ou égal au prix d'achat",
          });
        }
      }
    }

    const fields = [];
    const values = [];

    if (updates.sku !== undefined) {
      fields.push("sku = ?");
      values.push(updates.sku);
    }
    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.category !== undefined) {
      fields.push("category = ?");
      values.push(updates.category);
    }
    if (updates.brand !== undefined) {
      fields.push("brand = ?");
      values.push(updates.brand);
    }
    if (updates.model !== undefined) {
      fields.push("model = ?");
      values.push(updates.model);
    }
    if (updates.pricePurchase !== undefined) {
      fields.push("price_purchase = ?");
      values.push(updates.pricePurchase);
    }
    if (updates.priceSale !== undefined) {
      fields.push("price_sale = ?");
      values.push(updates.priceSale);
    }
    if (updates.stock !== undefined) {
      fields.push("stock = ?");
      values.push(updates.stock);
    }
    if (updates.alertThreshold !== undefined) {
      fields.push("alert_threshold = ?");
      values.push(updates.alertThreshold);
    }
    if (updates.imageUrl !== undefined) {
      fields.push("image_url = ?");
      values.push(updates.imageUrl);
    }
    if (updates.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(updates.isActive);
    }

    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await pool.execute(
      `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    const [rows] = await pool.execute("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
    const product = rows[0];

    res.json({
      data: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        brand: product.brand,
        model: product.model,
        pricePurchase: product.price_purchase,
        priceSale: product.price_sale,
        stock: product.stock,
        alertThreshold: product.alert_threshold,
        imageUrl: product.image_url,
        isActive: product.is_active,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] PUT /api/products/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute("DELETE FROM products WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/products/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// CUSTOMERS ENDPOINTS
// ===========================================

app.get("/api/public/customers", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `SELECT c.*,
      COALESCE((SELECT SUM(s.total) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed'), 0)
      + COALESCE((SELECT SUM(r.estimated_cost) FROM repairs r WHERE r.customer_id = c.id AND r.status = 'delivered'), 0)
      AS computed_total_spent
      FROM customers c`;
    const params = [];

    if (search) {
      sql += " WHERE c.phone LIKE ? OR c.name LIKE ?";
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY c.created_at DESC";

    const [rows] = await pool.execute(sql, params);
    const customers = rows.map((c) => ({
      id: c.id,
      phone: c.phone,
      name: c.name,
      firstVisit: c.first_visit,
      totalSpent: c.computed_total_spent,
      createdAt: c.created_at,
    }));

    res.json({ data: customers });
  } catch (error) {
    console.error("[API] GET /api/public/customers - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute("SELECT * FROM customers WHERE id = ?", [
      id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    const customer = rows[0];
    res.json({
      data: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        firstVisit: customer.first_visit,
        totalSpent: customer.total_spent,
        createdAt: customer.created_at,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/customers/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/customers", async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone || !name) {
      return res.status(400).json({ error: "Téléphone et nom sont requis" });
    }
    const [result] = await pool.execute(
      "INSERT INTO customers (phone, name, total_spent) VALUES (?, ?, 0)",
      [phone, name],
    );
    const [rows] = await pool.execute("SELECT * FROM customers WHERE id = ?", [
      result.insertId,
    ]);
    const customer = rows[0];
    res.status(201).json({
      data: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        firstVisit: customer.first_visit,
        totalSpent: customer.total_spent,
        createdAt: customer.created_at,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/customers - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    const fields = [];
    const values = [];
    if (name) {
      fields.push("name = ?");
      values.push(name);
    }
    if (phone) {
      fields.push("phone = ?");
      values.push(phone);
    }
    values.push(id);

    if (fields.length > 0) {
      await pool.execute(
        `UPDATE customers SET ${fields.join(", ")} WHERE id = ?`,
        values,
      );
    }

    const [rows] = await pool.execute("SELECT * FROM customers WHERE id = ?", [
      id,
    ]);
    const customer = rows[0];
    res.json({
      data: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        firstVisit: customer.first_visit,
        totalSpent: customer.total_spent,
        createdAt: customer.created_at,
      },
    });
  } catch (error) {
    console.error("[API] PUT /api/customers/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/customers/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    const [customers] = await pool.execute(
      "SELECT * FROM customers WHERE id = ?",
      [id],
    );
    if (customers.length === 0) {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    const customer = customers[0];

    const [sales] = await pool.execute(
      "SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC",
      [id],
    );
    const [repairs] = await pool.execute(
      "SELECT * FROM repairs WHERE customer_id = ? ORDER BY created_at DESC",
      [id],
    );

    // Calculate totalSpent from completed sales + delivered repairs
    const salesTotalSpent = sales
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + (s.total || 0), 0);
    const repairsTotalSpent = repairs
      .filter((r) => r.status === "delivered")
      .reduce((sum, r) => sum + (r.estimated_cost || 0), 0);
    const computedTotalSpent = salesTotalSpent + repairsTotalSpent;

    res.json({
      data: {
        customer: {
          id: customer.id,
          phone: customer.phone,
          name: customer.name,
          firstVisit: customer.first_visit,
          totalSpent: computedTotalSpent,
          createdAt: customer.created_at,
        },
        sales: sales.map((s) => ({
          id: s.id,
          customerId: s.customer_id,
          userId: s.user_id,
          total: s.total,
          discount: s.discount,
          paymentMethod: s.payment_method,
          status: s.status,
          createdAt: s.created_at,
        })),
        repairs: repairs.map((r) => ({
          id: r.id,
          customerId: r.customer_id,
          deviceBrand: r.device_brand,
          deviceModel: r.device_model,
          status: r.status,
          estimatedCost: r.estimated_cost,
          createdAt: r.created_at,
        })),
      },
    });
  } catch (error) {
    console.error(
      "[API] GET /api/public/customers/:id/history - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// SALES ENDPOINTS
// ===========================================

app.get("/api/public/sales", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const [sales] = await pool.execute(
      `SELECT * FROM sales ORDER BY created_at DESC LIMIT ${limit}`,
    );
    res.json({
      data: sales.map((s) => ({
        id: s.id,
        customerId: s.customer_id,
        userId: s.user_id,
        total: s.total,
        discount: s.discount,
        paymentMethod: s.payment_method,
        status: s.status,
        createdAt: s.created_at,
      })),
    });
  } catch (error) {
    console.error(
      "[API] GET /api/public/sales - error:",
      error.message,
      error.stack,
    );
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

app.post("/api/sales", async (req, res) => {
  try {
    const { customerId, items, discount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ error: "La vente doit contenir au moins un article" });
    }

    let total = 0;
    for (const item of items) {
      total += item.unitPrice * item.quantity;
    }
    const finalTotal = total - (discount || 0);

    const now = Math.floor(Date.now() / 1000);
    const [saleResult] = await pool.execute(
      `INSERT INTO sales (customer_id, user_id, total, discount, payment_method, status, created_at)
       VALUES (?, 1, ?, ?, ?, 'completed', ?)`,
      [
        customerId || null,
        finalTotal,
        discount || 0,
        paymentMethod || "cash",
        now,
      ],
    );
    const saleId = saleResult.insertId;

    for (const item of items) {
      await pool.execute(
        "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)",
        [
          saleId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.unitPrice * item.quantity,
        ],
      );
      await pool.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [
        item.quantity,
        item.productId,
      ]);
    }

    if (customerId) {
      await pool.execute(
        "UPDATE customers SET total_spent = COALESCE(total_spent, 0) + ? WHERE id = ?",
        [finalTotal, customerId],
      );
    }

    // Loyalty points: redeem if requested (US4)
    const loyaltyPointsUsed = req.body.loyaltyPointsUsed || 0;
    if (loyaltyPointsUsed > 0 && customerId) {
      try {
        await pool.execute(
          "UPDATE customers SET loyalty_points = loyalty_points - ? WHERE id = ?",
          [loyaltyPointsUsed, customerId],
        );
        await pool.execute(
          "INSERT INTO loyalty_transactions (customer_id, sale_id, points, type, description, created_at) VALUES (?, ?, ?, 'redeem', ?, ?)",
          [
            customerId,
            saleId,
            -loyaltyPointsUsed,
            `Remise fidélité — ${loyaltyPointsUsed} points utilisés`,
            now,
          ],
        );
      } catch (e) {
        console.error("Loyalty redeem error:", e.message);
      }
    }

    // Loyalty points: earn (US4)
    if (customerId && finalTotal > 0) {
      try {
        const pointsEarned = Math.floor(finalTotal / 100); // 1 point per monetary unit (finalTotal is in centimes)
        await pool.execute(
          "UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?",
          [pointsEarned, customerId],
        );
        await pool.execute(
          "INSERT INTO loyalty_transactions (customer_id, sale_id, points, type, description, created_at) VALUES (?, ?, ?, 'earn', ?, ?)",
          [
            customerId,
            saleId,
            pointsEarned,
            `Achat #${saleId} — ${pointsEarned} points gagnés`,
            now,
          ],
        );
      } catch (e) {
        console.error("Loyalty earn error:", e.message);
      }
    }

    // Notifications: check low stock after sale (US2)
    try {
      for (const item of items) {
        const [prods] = await pool.execute(
          "SELECT id, name, stock, alert_threshold FROM products WHERE id = ?",
          [item.productId],
        );
        if (prods.length > 0 && prods[0].stock <= prods[0].alert_threshold) {
          await pool.execute(
            "INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id, created_at) VALUES (NULL, 'stock_low', 'Stock bas', ?, 'product', ?, ?)",
            [
              `Le produit '${prods[0].name}' n'a plus que ${prods[0].stock} unités en stock`,
              prods[0].id,
              now,
            ],
          );
        }
      }
    } catch (e) {
      console.error("Notification error:", e.message);
    }

    const [rows] = await pool.execute("SELECT * FROM sales WHERE id = ?", [
      saleId,
    ]);
    const sale = rows[0];
    res.status(201).json({
      data: {
        id: sale.id,
        customerId: sale.customer_id,
        userId: sale.user_id,
        total: sale.total,
        discount: sale.discount,
        paymentMethod: sale.payment_method,
        status: sale.status,
        createdAt: sale.created_at,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/sales - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/sales/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute("SELECT * FROM sales WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Vente non trouvée" });
    }

    const sale = rows[0];
    if (sale.status !== "completed") {
      return res
        .status(400)
        .json({ error: "Cette vente ne peut pas être annulée" });
    }

    // Restore stock
    const [items] = await pool.execute(
      "SELECT * FROM sale_items WHERE sale_id = ?",
      [id],
    );
    for (const item of items) {
      await pool.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [
        item.quantity,
        item.product_id,
      ]);
    }

    await pool.execute("UPDATE sales SET status = 'cancelled' WHERE id = ?", [
      id,
    ]);

    // Loyalty reversal on cancellation (US4)
    try {
      const [loyaltyTxs] = await pool.execute(
        "SELECT * FROM loyalty_transactions WHERE sale_id = ?",
        [id],
      );
      for (const tx of loyaltyTxs) {
        const reversePoints = -tx.points;
        await pool.execute(
          "UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?",
          [reversePoints, tx.customer_id],
        );
        const now = Math.floor(Date.now() / 1000);
        await pool.execute(
          "INSERT INTO loyalty_transactions (customer_id, sale_id, points, type, description, created_at) VALUES (?, ?, ?, 'cancel', ?, ?)",
          [
            tx.customer_id,
            id,
            reversePoints,
            `Annulation vente #${id} — inversion de ${Math.abs(tx.points)} points`,
            now,
          ],
        );
      }
    } catch (e) {
      console.error("Loyalty cancel error:", e.message);
    }

    const [updated] = await pool.execute("SELECT * FROM sales WHERE id = ?", [
      id,
    ]);
    res.json({
      data: {
        id: updated[0].id,
        customerId: updated[0].customer_id,
        userId: updated[0].user_id,
        total: updated[0].total,
        discount: updated[0].discount,
        paymentMethod: updated[0].payment_method,
        status: updated[0].status,
        createdAt: updated[0].created_at,
      },
    });
  } catch (error) {
    console.error("[API] PUT /api/sales/:id/cancel - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// REPAIRS ENDPOINTS
// ===========================================

app.get("/api/public/repairs", async (req, res) => {
  try {
    const { status, customerId } = req.query;
    let sql = "SELECT * FROM repairs WHERE 1=1";
    const params = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (customerId) {
      sql += " AND customer_id = ?";
      params.push(customerId);
    }
    sql += " ORDER BY created_at DESC";

    const [repairs] = await pool.execute(sql, params);
    res.json({
      data: repairs.map((r) => ({
        id: r.id,
        customerId: r.customer_id,
        deviceBrand: r.device_brand,
        deviceModel: r.device_model,
        deviceVariant: r.device_variant,
        devicePassword: r.device_password,
        physicalState: r.physical_state,
        issueDescription: r.issue_description,
        diagnosis: r.diagnosis,
        status: r.status,
        estimatedCost: r.estimated_cost,
        finalCost: r.final_cost,
        technicianId: r.technician_id,
        promisedDate: r.promised_date,
        deliveredAt: r.delivered_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/public/repairs - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/repairs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [repairs] = await pool.execute("SELECT * FROM repairs WHERE id = ?", [
      id,
    ]);
    if (repairs.length === 0) {
      return res.status(404).json({ error: "Réparation non trouvée" });
    }
    const repair = repairs[0];
    const [customers] = await pool.execute(
      "SELECT * FROM customers WHERE id = ?",
      [repair.customer_id],
    );
    const customer = customers[0];
    res.json({
      data: {
        id: repair.id,
        customerId: repair.customer_id,
        deviceBrand: repair.device_brand,
        deviceModel: repair.device_model,
        deviceVariant: repair.device_variant,
        devicePassword: repair.device_password,
        physicalState: repair.physical_state,
        issueDescription: repair.issue_description,
        diagnosis: repair.diagnosis,
        status: repair.status,
        estimatedCost: repair.estimated_cost,
        finalCost: repair.final_cost,
        technicianId: repair.technician_id,
        promisedDate: repair.promised_date,
        deliveredAt: repair.delivered_at,
        createdAt: repair.created_at,
        updatedAt: repair.updated_at,
        customer: customer
          ? {
              id: customer.id,
              phone: customer.phone,
              name: customer.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/repairs/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/repairs", async (req, res) => {
  try {
    const {
      customerId,
      deviceBrand,
      deviceModel,
      deviceVariant,
      devicePassword,
      physicalState,
      issueDescription,
      diagnosis,
      estimatedCost,
      technicianId,
      promisedDate,
    } = req.body;

    if (!customerId || !deviceBrand || !deviceModel || !issueDescription) {
      return res.status(400).json({
        error: "Client, marque, modèle et description du problème sont requis",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO repairs (customer_id, device_brand, device_model, device_variant, device_password, physical_state, issue_description, diagnosis, status, estimated_cost, technician_id, promised_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)`,
      [
        customerId,
        deviceBrand,
        deviceModel,
        deviceVariant || null,
        devicePassword || null,
        physicalState || null,
        issueDescription,
        diagnosis || null,
        estimatedCost || 0,
        technicianId || null,
        promisedDate || null,
      ],
    );

    const [repairs] = await pool.execute("SELECT * FROM repairs WHERE id = ?", [
      result.insertId,
    ]);
    const repair = repairs[0];
    res.status(201).json({
      data: {
        id: repair.id,
        customerId: repair.customer_id,
        deviceBrand: repair.device_brand,
        deviceModel: repair.device_model,
        status: repair.status,
        estimatedCost: repair.estimated_cost,
        createdAt: repair.created_at,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/repairs - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/repairs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = Math.floor(Date.now() / 1000);

    const fields = ["updated_at = ?"];
    const values = [now];

    if (updates.deviceBrand !== undefined) {
      fields.push("device_brand = ?");
      values.push(updates.deviceBrand);
    }
    if (updates.deviceModel !== undefined) {
      fields.push("device_model = ?");
      values.push(updates.deviceModel);
    }
    if (updates.deviceVariant !== undefined) {
      fields.push("device_variant = ?");
      values.push(updates.deviceVariant);
    }
    if (updates.devicePassword !== undefined) {
      fields.push("device_password = ?");
      values.push(updates.devicePassword);
    }
    if (updates.physicalState !== undefined) {
      fields.push("physical_state = ?");
      values.push(updates.physicalState);
    }
    if (updates.issueDescription !== undefined) {
      fields.push("issue_description = ?");
      values.push(updates.issueDescription);
    }
    if (updates.diagnosis !== undefined) {
      fields.push("diagnosis = ?");
      values.push(updates.diagnosis);
    }
    if (updates.status !== undefined) {
      fields.push("status = ?");
      values.push(updates.status);
      if (updates.status === "delivered") {
        fields.push("delivered_at = ?");
        values.push(now);
      }
    }
    if (updates.estimatedCost !== undefined) {
      fields.push("estimated_cost = ?");
      values.push(updates.estimatedCost);
    }
    if (updates.finalCost !== undefined) {
      fields.push("final_cost = ?");
      values.push(updates.finalCost);
    }
    if (updates.technicianId !== undefined) {
      fields.push("technician_id = ?");
      values.push(updates.technicianId);
    }
    if (updates.promisedDate !== undefined) {
      fields.push("promised_date = ?");
      values.push(updates.promisedDate);
    }

    values.push(id);
    await pool.execute(
      `UPDATE repairs SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    const [repairs] = await pool.execute("SELECT * FROM repairs WHERE id = ?", [
      id,
    ]);
    const repair = repairs[0];
    res.json({
      data: {
        id: repair.id,
        customerId: repair.customer_id,
        deviceBrand: repair.device_brand,
        deviceModel: repair.device_model,
        status: repair.status,
        estimatedCost: repair.estimated_cost,
        updatedAt: repair.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] PUT /api/repairs/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.patch("/api/repairs/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const now = Math.floor(Date.now() / 1000);

    if (!["new", "diagnostic", "repair", "delivered"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    if (status === "delivered") {
      // Get repair details to update customer total_spent
      const [repairRows] = await pool.execute(
        "SELECT customer_id, estimated_cost FROM repairs WHERE id = ?",
        [id],
      );
      await pool.execute(
        "UPDATE repairs SET status = ?, updated_at = ?, delivered_at = ? WHERE id = ?",
        [status, now, now, id],
      );
      // Update customer total_spent with repair cost
      if (
        repairRows.length > 0 &&
        repairRows[0].customer_id &&
        repairRows[0].estimated_cost
      ) {
        await pool.execute(
          "UPDATE customers SET total_spent = COALESCE(total_spent, 0) + ? WHERE id = ?",
          [repairRows[0].estimated_cost, repairRows[0].customer_id],
        );
      }
    } else {
      await pool.execute(
        "UPDATE repairs SET status = ?, updated_at = ? WHERE id = ?",
        [status, now, id],
      );
    }

    // Notification: repair status change (US2)
    try {
      const statusLabels = {
        new: "Nouvelle",
        diagnostic: "En diagnostic",
        repair: "En réparation",
        delivered: "Livrée",
      };
      const [repairForNotif] = await pool.execute(
        "SELECT r.*, c.name as customer_name FROM repairs r LEFT JOIN customers c ON r.customer_id = c.id WHERE r.id = ?",
        [id],
      );
      if (repairForNotif.length > 0) {
        const r = repairForNotif[0];
        await pool.execute(
          "INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id, created_at) VALUES (NULL, 'repair_status', ?, ?, 'repair', ?, ?)",
          [
            `Réparation #${r.id}`,
            `Réparation de ${r.customer_name || "Client"} (${r.device_brand} ${r.device_model}) — Statut: ${statusLabels[status] || status}`,
            id,
            now,
          ],
        );
      }
    } catch (e) {
      console.error("Notification error:", e.message);
    }

    const [repairs] = await pool.execute("SELECT * FROM repairs WHERE id = ?", [
      id,
    ]);
    const repair = repairs[0];
    res.json({
      data: {
        id: repair.id,
        status: repair.status,
        updatedAt: repair.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] PATCH /api/repairs/:id/status - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// REPAIR COMPONENTS ENDPOINTS
// ===========================================

// Get components for a repair
app.get("/api/repairs/:repairId/components", async (req, res) => {
  try {
    const { repairId } = req.params;
    const [components] = await pool.execute(
      `SELECT rc.id, rc.repair_id as repairId, rc.product_id as productId,
              rc.quantity, rc.unit_price as unitPrice,
              p.name as productName, p.sku as productSku
       FROM repair_components rc
       JOIN products p ON p.id = rc.product_id
       WHERE rc.repair_id = ?`,
      [repairId],
    );
    res.json({ data: components });
  } catch (error) {
    console.error(
      "[API] GET /api/repairs/:repairId/components - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Set components for a repair (replace all)
app.put("/api/repairs/:repairId/components", async (req, res) => {
  try {
    const { repairId } = req.params;
    const { components } = req.body; // Array of { productId, quantity, unitPrice }

    // Delete existing components
    await pool.execute("DELETE FROM repair_components WHERE repair_id = ?", [
      repairId,
    ]);

    // Insert new components
    if (components && components.length > 0) {
      for (const comp of components) {
        await pool.execute(
          `INSERT INTO repair_components (repair_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
          [repairId, comp.productId, comp.quantity, comp.unitPrice],
        );
      }
    }

    // Return updated components
    const [updatedComponents] = await pool.execute(
      `SELECT rc.id, rc.repair_id as repairId, rc.product_id as productId,
              rc.quantity, rc.unit_price as unitPrice,
              p.name as productName, p.sku as productSku
       FROM repair_components rc
       JOIN products p ON p.id = rc.product_id
       WHERE rc.repair_id = ?`,
      [repairId],
    );

    res.json({ data: updatedComponents });
  } catch (error) {
    console.error(
      "[API] PUT /api/repairs/:repairId/components - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// CASH SESSIONS ENDPOINTS
// ===========================================

app.get("/api/public/cash-sessions/current", async (req, res) => {
  try {
    const [sessions] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1",
    );
    const session = sessions[0];
    res.json({
      data: session
        ? {
            id: session.id,
            userId: session.user_id,
            openingAmount: session.opening_amount,
            closingAmount: session.closing_amount,
            expectedAmount: session.expected_amount,
            difference: session.difference,
            openedAt: session.opened_at,
            closedAt: session.closed_at,
            notes: session.notes,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "[API] GET /api/public/cash-sessions/current - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/cash-sessions", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const [sessions] = await pool.execute(
      `SELECT * FROM cash_sessions ORDER BY opened_at DESC LIMIT ${limit}`,
    );
    res.json({
      data: sessions.map((s) => ({
        id: s.id,
        userId: s.user_id,
        openingAmount: s.opening_amount,
        closingAmount: s.closing_amount,
        expectedAmount: s.expected_amount,
        difference: s.difference,
        openedAt: s.opened_at,
        closedAt: s.closed_at,
        notes: s.notes,
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/public/cash-sessions - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/cash-sessions/open", async (req, res) => {
  try {
    const { openingAmount, notes } = req.body;

    const [openSessions] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE closed_at IS NULL",
    );
    if (openSessions.length > 0) {
      return res
        .status(400)
        .json({ error: "Une session de caisse est déjà ouverte" });
    }

    const [result] = await pool.execute(
      "INSERT INTO cash_sessions (user_id, opening_amount, notes) VALUES (1, ?, ?)",
      [openingAmount || 0, notes || null],
    );

    const [sessions] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE id = ?",
      [result.insertId],
    );
    const session = sessions[0];
    res.status(201).json({
      data: {
        id: session.id,
        userId: session.user_id,
        openingAmount: session.opening_amount,
        openedAt: session.opened_at,
        notes: session.notes,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/cash-sessions/open - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/cash-sessions/:id/close", async (req, res) => {
  try {
    const { id } = req.params;
    const { closingAmount, notes } = req.body;
    const now = Math.floor(Date.now() / 1000);

    const [sessions] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE id = ?",
      [id],
    );
    if (sessions.length === 0) {
      return res.status(404).json({ error: "Session non trouvée" });
    }
    const session = sessions[0];
    if (session.closed_at) {
      return res.status(400).json({ error: "Cette session est déjà fermée" });
    }

    // Calculate expected amount
    const [salesResult] = await pool.execute(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM sales
       WHERE payment_method = 'cash' AND status = 'completed' AND created_at >= ?`,
      [session.opened_at],
    );

    const expectedAmount = session.opening_amount + (salesResult[0].total || 0);
    const difference = (closingAmount || 0) - expectedAmount;

    await pool.execute(
      `UPDATE cash_sessions
       SET closing_amount = ?, expected_amount = ?, difference = ?, closed_at = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [closingAmount || 0, expectedAmount, difference, now, notes, id],
    );

    const [updated] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE id = ?",
      [id],
    );
    res.json({
      data: {
        id: updated[0].id,
        userId: updated[0].user_id,
        openingAmount: updated[0].opening_amount,
        closingAmount: updated[0].closing_amount,
        expectedAmount: updated[0].expected_amount,
        difference: updated[0].difference,
        openedAt: updated[0].opened_at,
        closedAt: updated[0].closed_at,
        notes: updated[0].notes,
      },
    });
  } catch (error) {
    console.error("[API] PUT /api/cash-sessions/:id/close - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// DASHBOARD STATS
// ===========================================

app.get("/api/public/stats/dashboard", async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);

    // Ventes du jour
    const [salesTodayResult] = await pool.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM sales
       WHERE created_at >= ? AND status = 'completed'`,
      [todayStart],
    );
    const salesToday = {
      count: Number(salesTodayResult[0].count) || 0,
      total: Number(salesTodayResult[0].total) || 0,
    };

    // Réparations livrées aujourd'hui
    const [repairsDeliveredTodayResult] = await pool.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(COALESCE(final_cost, estimated_cost)), 0) as total
       FROM repairs
       WHERE status = 'delivered'
         AND (delivered_at >= ? OR (delivered_at IS NULL AND updated_at >= ?))`,
      [todayStart, todayStart],
    );
    const repairsDeliveredToday = {
      count: Number(repairsDeliveredTodayResult[0].count) || 0,
      total: Number(repairsDeliveredTodayResult[0].total) || 0,
    };

    // Chiffre d'affaires total du jour
    const totalRevenueToday = salesToday.total + repairsDeliveredToday.total;
    const totalCountToday = salesToday.count + repairsDeliveredToday.count;

    const [repairsByStatus] = await pool.execute(
      `SELECT status, COUNT(*) as count FROM repairs GROUP BY status`,
    );

    const [lowStockResult] = await pool.execute(
      `SELECT COUNT(*) as count FROM products WHERE stock <= alert_threshold AND is_active = 1`,
    );
    const lowStockCount = Number(lowStockResult[0].count) || 0;

    const [totalProductsResult] = await pool.execute(
      "SELECT COUNT(*) as count FROM products WHERE is_active = 1",
    );
    const totalProducts = Number(totalProductsResult[0].count) || 0;

    const [totalCustomersResult] = await pool.execute(
      "SELECT COUNT(*) as count FROM customers",
    );
    const totalCustomers = Number(totalCustomersResult[0].count) || 0;

    res.json({
      data: {
        salesToday: {
          count: totalCountToday,
          total: totalRevenueToday,
          salesCount: salesToday.count || 0,
          salesTotal: salesToday.total || 0,
          repairsCount: repairsDeliveredToday.count || 0,
          repairsTotal: repairsDeliveredToday.total || 0,
        },
        repairs: repairsByStatus.reduce((acc, r) => {
          acc[r.status] = Number(r.count) || 0;
          return acc;
        }, {}),
        lowStockCount: lowStockCount,
        totalProducts: totalProducts,
        totalCustomers: totalCustomers,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/stats/dashboard - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/stats/sales", async (req, res) => {
  try {
    const period = req.query.period || "week";
    const now = Math.floor(Date.now() / 1000);

    let startDate;
    switch (period) {
      case "month":
        startDate = now - 30 * 86400;
        break;
      case "year":
        startDate = now - 365 * 86400;
        break;
      default:
        startDate = now - 7 * 86400;
    }

    const [result] = await pool.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM sales
       WHERE created_at >= ? AND status = 'completed'`,
      [startDate],
    );

    res.json({
      data: {
        period,
        count: result[0].count || 0,
        total: result[0].total || 0,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/stats/sales - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// DEVICE BRANDS & MODELS ENDPOINTS
// ===========================================

// Get all brands (public)
app.get("/api/public/device-brands", async (req, res) => {
  try {
    const [brands] = await pool.execute(
      `SELECT id, name, logo_url as logoUrl, is_active as isActive, sort_order as sortOrder
       FROM device_brands
       WHERE is_active = 1
       ORDER BY sort_order, name`,
    );
    res.json({ data: brands });
  } catch (error) {
    console.error("[API] GET /api/public/device-brands - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Get all brands (admin - includes inactive)
app.get("/api/admin/device-brands", async (req, res) => {
  try {
    const [brands] = await pool.execute(
      `SELECT id, name, logo_url as logoUrl, is_active as isActive, sort_order as sortOrder, created_at as createdAt
       FROM device_brands
       ORDER BY sort_order, name`,
    );
    res.json({ data: brands });
  } catch (error) {
    console.error("[API] GET /api/admin/device-brands - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Create brand
app.post("/api/admin/device-brands", async (req, res) => {
  try {
    const { name, logoUrl, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Le nom est requis" });
    }

    const [result] = await pool.execute(
      `INSERT INTO device_brands (name, logo_url, sort_order) VALUES (?, ?, ?)`,
      [name, logoUrl || null, sortOrder || 0],
    );

    const [brands] = await pool.execute(
      `SELECT id, name, logo_url as logoUrl, is_active as isActive, sort_order as sortOrder FROM device_brands WHERE id = ?`,
      [result.insertId],
    );

    res.json({ data: brands[0] });
  } catch (error) {
    console.error("[API] POST /api/admin/device-brands - error:", error);
    if (error.message?.includes("Duplicate")) {
      return res.status(400).json({ error: "Cette marque existe déjà" });
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Update brand
app.put("/api/admin/device-brands/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logoUrl, isActive, sortOrder } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (logoUrl !== undefined) {
      updates.push("logo_url = ?");
      params.push(logoUrl);
    }
    if (isActive !== undefined) {
      updates.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    if (sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(sortOrder);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Aucune modification" });
    }

    params.push(id);
    await pool.execute(
      `UPDATE device_brands SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    const [brands] = await pool.execute(
      `SELECT id, name, logo_url as logoUrl, is_active as isActive, sort_order as sortOrder FROM device_brands WHERE id = ?`,
      [id],
    );

    res.json({ data: brands[0] });
  } catch (error) {
    console.error("[API] PUT /api/admin/device-brands/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Delete brand
app.delete("/api/admin/device-brands/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(`DELETE FROM device_brands WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/admin/device-brands/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Get models for a brand (public)
app.get("/api/public/device-brands/:brandId/models", async (req, res) => {
  try {
    const { brandId } = req.params;
    const [models] = await pool.execute(
      `SELECT id, brand_id as brandId, name, variant, is_active as isActive, sort_order as sortOrder
       FROM device_models
       WHERE brand_id = ? AND is_active = 1
       ORDER BY sort_order, name`,
      [brandId],
    );
    res.json({ data: models });
  } catch (error) {
    console.error(
      "[API] GET /api/public/device-brands/:brandId/models - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Get all models for a brand (admin)
app.get("/api/admin/device-brands/:brandId/models", async (req, res) => {
  try {
    const { brandId } = req.params;
    const [models] = await pool.execute(
      `SELECT id, brand_id as brandId, name, variant, is_active as isActive, sort_order as sortOrder, created_at as createdAt
       FROM device_models
       WHERE brand_id = ?
       ORDER BY sort_order, name`,
      [brandId],
    );
    res.json({ data: models });
  } catch (error) {
    console.error(
      "[API] GET /api/admin/device-brands/:brandId/models - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Create model
app.post("/api/admin/device-models", async (req, res) => {
  try {
    const { brandId, name, variant, sortOrder } = req.body;
    if (!brandId || !name) {
      return res.status(400).json({ error: "brandId et name sont requis" });
    }

    const [result] = await pool.execute(
      `INSERT INTO device_models (brand_id, name, variant, sort_order) VALUES (?, ?, ?, ?)`,
      [brandId, name, variant || null, sortOrder || 0],
    );

    const [models] = await pool.execute(
      `SELECT id, brand_id as brandId, name, variant, is_active as isActive, sort_order as sortOrder FROM device_models WHERE id = ?`,
      [result.insertId],
    );

    res.json({ data: models[0] });
  } catch (error) {
    console.error("[API] POST /api/admin/device-models - error:", error);
    if (error.message?.includes("Duplicate")) {
      return res
        .status(400)
        .json({ error: "Ce modèle existe déjà pour cette marque" });
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Update model
app.put("/api/admin/device-models/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, variant, isActive, sortOrder } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (variant !== undefined) {
      updates.push("variant = ?");
      params.push(variant);
    }
    if (isActive !== undefined) {
      updates.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }
    if (sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(sortOrder);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Aucune modification" });
    }

    params.push(id);
    await pool.execute(
      `UPDATE device_models SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    const [models] = await pool.execute(
      `SELECT id, brand_id as brandId, name, variant, is_active as isActive, sort_order as sortOrder FROM device_models WHERE id = ?`,
      [id],
    );

    res.json({ data: models[0] });
  } catch (error) {
    console.error("[API] PUT /api/admin/device-models/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Delete model
app.delete("/api/admin/device-models/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(`DELETE FROM device_models WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/admin/device-models/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// RECEIPT & TICKET ENDPOINTS (US1)
// ===========================================

app.get("/api/public/sales/:id/receipt", async (req, res) => {
  try {
    const { id } = req.params;
    const [sales] = await pool.execute("SELECT * FROM sales WHERE id = ?", [
      id,
    ]);
    if (sales.length === 0)
      return res.status(404).json({ error: "Vente introuvable" });
    const sale = sales[0];

    const [items] = await pool.execute(
      `SELECT si.quantity, si.unit_price, si.subtotal, p.name AS product_name
       FROM sale_items si LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [id],
    );

    let customer = null;
    if (sale.customer_id) {
      const [customers] = await pool.execute(
        "SELECT name, phone FROM customers WHERE id = ?",
        [sale.customer_id],
      );
      if (customers.length > 0) customer = customers[0];
    }

    let sellerName = "Vendeur";
    if (sale.user_id) {
      const [users] = await pool.execute(
        "SELECT name FROM users WHERE id = ?",
        [sale.user_id],
      );
      if (users.length > 0) sellerName = users[0].name;
    }

    res.json({
      data: {
        sale: {
          id: sale.id,
          total: sale.total,
          discount: sale.discount,
          paymentMethod: sale.payment_method,
          status: sale.status,
          createdAt: sale.created_at,
        },
        items: items.map((i) => ({
          productName: i.product_name || "Produit",
          quantity: i.quantity,
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
        })),
        customer,
        store: { name: "Aroua Store", address: "", phone: "", email: "" },
        seller: { name: sellerName },
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/sales/:id/receipt - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/repairs/:id/ticket", async (req, res) => {
  try {
    const { id } = req.params;
    const [repairs] = await pool.execute("SELECT * FROM repairs WHERE id = ?", [
      id,
    ]);
    if (repairs.length === 0)
      return res.status(404).json({ error: "Réparation introuvable" });
    const repair = repairs[0];

    const [customers] = await pool.execute(
      "SELECT name, phone FROM customers WHERE id = ?",
      [repair.customer_id],
    );
    const customer =
      customers.length > 0 ? customers[0] : { name: "Client", phone: "" };

    let technician = null;
    if (repair.technician_id) {
      const [users] = await pool.execute(
        "SELECT name FROM users WHERE id = ?",
        [repair.technician_id],
      );
      if (users.length > 0) technician = { name: users[0].name };
    }

    res.json({
      data: {
        repair: {
          id: repair.id,
          deviceBrand: repair.device_brand,
          deviceModel: repair.device_model,
          deviceVariant: repair.device_variant,
          issueDescription: repair.issue_description,
          estimatedCost: repair.estimated_cost,
          status: repair.status,
          promisedDate: repair.promised_date,
          createdAt: repair.created_at,
        },
        customer,
        technician,
        store: { name: "Aroua Store", address: "", phone: "" },
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/repairs/:id/ticket - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// NOTIFICATION ENDPOINTS (US2)
// ===========================================

app.get("/api/notifications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const unreadOnly = req.query.unread_only === "true";
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    let sql =
      "SELECT * FROM notifications WHERE (user_id IS NULL OR user_id = ?)";
    const params = [user.id];
    if (unreadOnly) {
      sql += " AND is_read = 0";
    }
    sql += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query(sql, params);
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as cnt FROM notifications WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0",
      [user.id],
    );

    res.json({
      data: {
        notifications: rows.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          referenceType: n.reference_type,
          referenceId: n.reference_id,
          isRead: !!n.is_read,
          createdAt: n.created_at,
        })),
        unreadCount: countRows[0].cnt,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/notifications - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/notifications/unread-count", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const [rows] = await pool.execute(
      "SELECT COUNT(*) as cnt FROM notifications WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0",
      [user.id],
    );
    res.json({ data: { count: rows[0].cnt } });
  } catch (error) {
    console.error("[API] GET /api/notifications/unread-count - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", [
      id,
    ]);
    res.json({ data: { id: parseInt(id), isRead: true } });
  } catch (error) {
    console.error("[API] PUT /api/notifications/:id/read - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/notifications/read-all", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const [result] = await pool.execute(
      "UPDATE notifications SET is_read = 1 WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0",
      [user.id],
    );
    res.json({ data: { updatedCount: result.affectedRows } });
  } catch (error) {
    console.error("[API] PUT /api/notifications/read-all - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// SUPPLIER ENDPOINTS (US3)
// ===========================================

app.get("/api/public/suppliers", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name",
    );
    res.json({
      data: rows.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        notes: s.notes,
        isActive: !!s.is_active,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/public/suppliers - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/suppliers/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM suppliers WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Fournisseur introuvable" });
    const s = rows[0];
    res.json({
      data: {
        id: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        notes: s.notes,
        isActive: !!s.is_active,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/suppliers/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/admin/suppliers", async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Le nom est requis" });
    const now = Math.floor(Date.now() / 1000);
    const [result] = await pool.execute(
      "INSERT INTO suppliers (name, phone, email, address, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        phone || null,
        email || null,
        address || null,
        notes || null,
        now,
        now,
      ],
    );
    const [rows] = await pool.execute("SELECT * FROM suppliers WHERE id = ?", [
      result.insertId,
    ]);
    const s = rows[0];
    res.status(201).json({
      data: {
        id: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        notes: s.notes,
        isActive: !!s.is_active,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/admin/suppliers - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/admin/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, notes } = req.body;
    const now = Math.floor(Date.now() / 1000);
    const fields = [];
    const values = [];
    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (phone !== undefined) {
      fields.push("phone = ?");
      values.push(phone);
    }
    if (email !== undefined) {
      fields.push("email = ?");
      values.push(email);
    }
    if (address !== undefined) {
      fields.push("address = ?");
      values.push(address);
    }
    if (notes !== undefined) {
      fields.push("notes = ?");
      values.push(notes);
    }
    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);
    await pool.execute(
      `UPDATE suppliers SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    const [rows] = await pool.execute("SELECT * FROM suppliers WHERE id = ?", [
      id,
    ]);
    const s = rows[0];
    res.json({
      data: {
        id: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        notes: s.notes,
        isActive: !!s.is_active,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      },
    });
  } catch (error) {
    console.error("[API] PUT /api/admin/suppliers/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/api/admin/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [pending] = await pool.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE supplier_id = ? AND status IN ('pending', 'partially_received')",
      [id],
    );
    if (pending[0].cnt > 0)
      return res.status(409).json({
        error:
          "Ce fournisseur a des commandes en cours. Veuillez d'abord les clôturer.",
      });
    await pool.execute("UPDATE suppliers SET is_active = 0 WHERE id = ?", [id]);
    res.json({ data: { success: true } });
  } catch (error) {
    console.error("[API] DELETE /api/admin/suppliers/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// PURCHASE ORDER ENDPOINTS (US3)
// ===========================================

app.get("/api/public/purchase-orders", async (req, res) => {
  try {
    const { status, supplier_id, limit: lim } = req.query;
    let sql =
      "SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE 1=1";
    const params = [];
    if (status) {
      sql += " AND po.status = ?";
      params.push(status);
    }
    if (supplier_id) {
      sql += " AND po.supplier_id = ?";
      params.push(supplier_id);
    }
    const poLimit = Math.min(Math.max(parseInt(lim) || 50, 1), 200);
    sql += ` ORDER BY po.created_at DESC LIMIT ${poLimit}`;
    const [rows] = await pool.query(sql, params);
    res.json({
      data: rows.map((po) => ({
        id: po.id,
        orderNumber: po.order_number,
        supplierId: po.supplier_id,
        supplierName: po.supplier_name,
        status: po.status,
        totalAmount: po.total_amount,
        notes: po.notes,
        orderedAt: po.ordered_at,
        receivedAt: po.received_at,
        createdBy: po.created_by,
        createdAt: po.created_at,
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/public/purchase-orders - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/purchase-orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [pos] = await pool.execute(
      "SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?",
      [id],
    );
    if (pos.length === 0)
      return res.status(404).json({ error: "Bon de commande introuvable" });
    const po = pos[0];
    const [items] = await pool.execute(
      `SELECT poi.*, p.name as product_name, p.sku as product_sku
       FROM purchase_order_items poi LEFT JOIN products p ON poi.product_id = p.id
       WHERE poi.purchase_order_id = ?`,
      [id],
    );
    res.json({
      data: {
        id: po.id,
        orderNumber: po.order_number,
        supplierId: po.supplier_id,
        supplierName: po.supplier_name,
        status: po.status,
        totalAmount: po.total_amount,
        notes: po.notes,
        orderedAt: po.ordered_at,
        receivedAt: po.received_at,
        createdBy: po.created_by,
        createdAt: po.created_at,
        items: items.map((i) => ({
          id: i.id,
          productId: i.product_id,
          productName: i.product_name,
          productSku: i.product_sku,
          quantityOrdered: i.quantity_ordered,
          quantityReceived: i.quantity_received,
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
        })),
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/purchase-orders/:id - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/admin/purchase-orders", async (req, res) => {
  try {
    const { supplierId, notes, items } = req.body;
    if (!supplierId || !items || items.length === 0)
      return res.status(400).json({ error: "Fournisseur et articles requis" });
    const now = Math.floor(Date.now() / 1000);

    // Generate order number using MAX(id) to avoid race conditions
    const [maxRows] = await pool.execute(
      "SELECT COALESCE(MAX(id), 0) as max_id FROM purchase_orders",
    );
    const num = (maxRows[0].max_id || 0) + 1;
    const year = new Date().getFullYear();
    const orderNumber = `PO-${year}-${String(num).padStart(4, "0")}`;

    let totalAmount = 0;
    const itemsWithPrices = [];
    for (const item of items) {
      const [products] = await pool.execute(
        "SELECT price_purchase FROM products WHERE id = ?",
        [item.productId],
      );
      const unitPrice = products.length > 0 ? products[0].price_purchase : 0;
      const subtotal = unitPrice * item.quantityOrdered;
      totalAmount += subtotal;
      itemsWithPrices.push({ ...item, unitPrice, subtotal });
    }

    const user = getCurrentUser(req);
    const [result] = await pool.execute(
      "INSERT INTO purchase_orders (order_number, supplier_id, total_amount, notes, created_by, ordered_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        orderNumber,
        supplierId,
        totalAmount,
        notes || null,
        user.id,
        now,
        now,
        now,
      ],
    );
    const poId = result.insertId;

    for (const item of itemsWithPrices) {
      await pool.execute(
        "INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)",
        [
          poId,
          item.productId,
          item.quantityOrdered,
          item.unitPrice,
          item.subtotal,
        ],
      );
    }

    const [pos] = await pool.execute(
      "SELECT * FROM purchase_orders WHERE id = ?",
      [poId],
    );
    res.status(201).json({
      data: {
        id: pos[0].id,
        orderNumber: pos[0].order_number,
        status: pos[0].status,
        totalAmount: pos[0].total_amount,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/admin/purchase-orders - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/admin/purchase-orders/:id/receive", async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const [pos] = await pool.execute(
      "SELECT * FROM purchase_orders WHERE id = ?",
      [id],
    );
    if (pos.length === 0)
      return res.status(404).json({ error: "Bon de commande introuvable" });
    if (pos[0].status === "received" || pos[0].status === "cancelled") {
      return res
        .status(400)
        .json({ error: "Cette commande ne peut plus être modifiée" });
    }
    const now = Math.floor(Date.now() / 1000);

    for (const item of items) {
      await pool.execute(
        "UPDATE purchase_order_items SET quantity_received = quantity_received + ? WHERE id = ?",
        [item.quantityReceived, item.itemId],
      );
      // Atomically increment product stock
      const [poiRows] = await pool.execute(
        "SELECT product_id FROM purchase_order_items WHERE id = ?",
        [item.itemId],
      );
      if (poiRows.length > 0) {
        await pool.execute(
          "UPDATE products SET stock = stock + ? WHERE id = ?",
          [item.quantityReceived, poiRows[0].product_id],
        );
      }
    }

    // Determine new status
    const [allItems] = await pool.execute(
      "SELECT * FROM purchase_order_items WHERE purchase_order_id = ?",
      [id],
    );
    const allReceived = allItems.every(
      (i) => i.quantity_received >= i.quantity_ordered,
    );
    const someReceived = allItems.some((i) => i.quantity_received > 0);
    const newStatus = allReceived
      ? "received"
      : someReceived
        ? "partially_received"
        : "pending";
    const receivedAt = allReceived ? now : null;

    await pool.execute(
      "UPDATE purchase_orders SET status = ?, received_at = ?, updated_at = ? WHERE id = ?",
      [newStatus, receivedAt, now, id],
    );
    const [updated] = await pool.execute(
      "SELECT * FROM purchase_orders WHERE id = ?",
      [id],
    );
    res.json({
      data: {
        id: updated[0].id,
        orderNumber: updated[0].order_number,
        status: updated[0].status,
        totalAmount: updated[0].total_amount,
      },
    });
  } catch (error) {
    console.error(
      "[API] PUT /api/admin/purchase-orders/:id/receive - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/admin/purchase-orders/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const [pos] = await pool.execute(
      "SELECT * FROM purchase_orders WHERE id = ?",
      [id],
    );
    if (pos.length === 0)
      return res.status(404).json({ error: "Bon de commande introuvable" });
    if (pos[0].status === "received")
      return res
        .status(400)
        .json({ error: "Cette commande ne peut plus être annulée" });
    const now = Math.floor(Date.now() / 1000);
    await pool.execute(
      "UPDATE purchase_orders SET status = 'cancelled', updated_at = ? WHERE id = ?",
      [now, id],
    );
    res.json({ data: { id: parseInt(id), status: "cancelled" } });
  } catch (error) {
    console.error(
      "[API] PUT /api/admin/purchase-orders/:id/cancel - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// LOYALTY ENDPOINTS (US4)
// ===========================================

app.get("/api/public/customers/:id/loyalty", async (req, res) => {
  try {
    const { id } = req.params;
    const [customers] = await pool.execute(
      "SELECT loyalty_points FROM customers WHERE id = ?",
      [id],
    );
    if (customers.length === 0)
      return res.status(404).json({ error: "Client introuvable" });
    const loyaltyPoints = customers[0].loyalty_points || 0;
    const pointsToCurrency = 100; // points needed per 1 monetary unit
    // equivalentDiscount in centimes (matching the rest of the system's integer arithmetic)
    const equivalentDiscount =
      Math.floor(loyaltyPoints / pointsToCurrency) * 100;

    const [transactions] = await pool.execute(
      "SELECT * FROM loyalty_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20",
      [id],
    );
    res.json({
      data: {
        customerId: parseInt(id),
        loyaltyPoints,
        equivalentDiscount,
        recentTransactions: transactions.map((t) => ({
          id: t.id,
          points: t.points,
          type: t.type,
          description: t.description,
          saleId: t.sale_id,
          createdAt: t.created_at,
        })),
      },
    });
  } catch (error) {
    console.error(
      "[API] GET /api/public/customers/:id/loyalty - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/loyalty/settings", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT config_value FROM app_config WHERE config_key = 'loyalty_settings'",
    );
    if (rows.length > 0) {
      res.json({ data: JSON.parse(rows[0].config_value) });
    } else {
      res.json({
        data: { enabled: true, pointsPerUnit: 1, pointsToCurrency: 100 },
      });
    }
  } catch (error) {
    console.error("[API] GET /api/public/loyalty/settings - error:", error);
    res.json({
      data: { enabled: true, pointsPerUnit: 1, pointsToCurrency: 100 },
    });
  }
});

app.put("/api/admin/loyalty/settings", async (req, res) => {
  try {
    const { enabled, pointsPerUnit, pointsToCurrency } = req.body;
    const settings = {
      enabled: enabled ?? true,
      pointsPerUnit: pointsPerUnit ?? 1,
      pointsToCurrency: pointsToCurrency ?? 100,
    };
    await pool.execute(
      "REPLACE INTO app_config (config_key, config_value) VALUES ('loyalty_settings', ?)",
      [JSON.stringify(settings)],
    );
    res.json({ data: settings });
  } catch (error) {
    console.error("[API] PUT /api/admin/loyalty/settings - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===========================================
// REPORT ENDPOINTS (US5)
// ===========================================

app.get("/api/public/reports/sales", async (req, res) => {
  try {
    const from = parseInt(req.query.from);
    const to = parseInt(req.query.to);
    if (!from || !to)
      return res.status(400).json({ error: "Paramètres from et to requis" });

    const [sales] = await pool.execute(
      "SELECT s.*, c.name as customer_name, u.name as seller_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE s.created_at >= ? AND s.created_at <= ? ORDER BY s.created_at DESC",
      [from, to],
    );

    let totalRevenue = 0,
      totalDiscount = 0,
      totalCost = 0;
    const byPaymentMethod = {};
    const productSales = {};
    const salesByDayMap = {};

    const salesWithItems = [];
    for (const sale of sales) {
      const [items] = await pool.execute(
        "SELECT si.*, p.name as product_name, p.sku, p.price_purchase FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?",
        [sale.id],
      );

      totalRevenue += sale.total;
      totalDiscount += sale.discount;

      const method = sale.payment_method || "cash";
      if (!byPaymentMethod[method])
        byPaymentMethod[method] = { count: 0, total: 0 };
      byPaymentMethod[method].count++;
      byPaymentMethod[method].total += sale.total;

      const day = new Date(sale.created_at * 1000).toISOString().split("T")[0];
      if (!salesByDayMap[day])
        salesByDayMap[day] = { date: day, count: 0, revenue: 0 };
      salesByDayMap[day].count++;
      salesByDayMap[day].revenue += sale.total;

      for (const item of items) {
        totalCost += (item.price_purchase || 0) * item.quantity;
        const pid = item.product_id;
        if (!productSales[pid])
          productSales[pid] = {
            productId: pid,
            productName: item.product_name,
            sku: item.sku || "",
            quantitySold: 0,
            revenue: 0,
          };
        productSales[pid].quantitySold += item.quantity;
        productSales[pid].revenue += item.subtotal;
      }

      salesWithItems.push({
        id: sale.id,
        customerName: sale.customer_name || null,
        total: sale.total,
        discount: sale.discount,
        paymentMethod: sale.payment_method,
        sellerName: sale.seller_name || "Vendeur",
        createdAt: sale.created_at,
        items: items.map((i) => ({
          productName: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
        })),
      });
    }

    const netRevenue = totalRevenue - totalDiscount;
    const grossMargin = netRevenue - totalCost;
    const marginPercentage =
      netRevenue > 0 ? Math.round((grossMargin / netRevenue) * 10000) : 0;
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      data: {
        period: { from, to },
        summary: {
          totalSales: sales.length,
          totalRevenue,
          totalDiscount,
          netRevenue,
          averageTicket:
            sales.length > 0 ? Math.round(netRevenue / sales.length) : 0,
          totalCost,
          grossMargin,
          marginPercentage,
        },
        byPaymentMethod,
        topProducts,
        salesByDay: Object.values(salesByDayMap).sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
        sales: salesWithItems,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/reports/sales - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/reports/inventory", async (req, res) => {
  try {
    const [products] = await pool.execute(
      "SELECT * FROM products ORDER BY name",
    );
    let totalStockValue = 0,
      totalRetailValue = 0,
      lowStockCount = 0,
      outOfStockCount = 0;
    const activeProducts = products.filter((p) => p.is_active);
    const byCategory = {};

    const productList = products.map((p) => {
      const stockValue = p.price_purchase * p.stock;
      const retailValue = p.price_sale * p.stock;
      totalStockValue += stockValue;
      totalRetailValue += retailValue;
      const isLowStock = p.stock <= p.alert_threshold && p.stock > 0;
      if (isLowStock) lowStockCount++;
      if (p.stock === 0) outOfStockCount++;

      const cat = p.category || "other";
      if (!byCategory[cat]) byCategory[cat] = { count: 0, stockValue: 0 };
      byCategory[cat].count++;
      byCategory[cat].stockValue += stockValue;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        brand: p.brand,
        stock: p.stock,
        alertThreshold: p.alert_threshold,
        pricePurchase: p.price_purchase,
        priceSale: p.price_sale,
        stockValue,
        retailValue,
        isLowStock,
      };
    });

    const lowStockProducts = productList
      .filter((p) => p.isLowStock)
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        stock: p.stock,
        alertThreshold: p.alertThreshold,
      }));

    res.json({
      data: {
        summary: {
          totalProducts: products.length,
          activeProducts: activeProducts.length,
          totalStockValue,
          totalRetailValue,
          lowStockCount,
          outOfStockCount,
        },
        byCategory,
        products: productList,
        lowStockProducts,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/reports/inventory - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/reports/cash-sessions", async (req, res) => {
  try {
    const from = parseInt(req.query.from);
    const to = parseInt(req.query.to);
    if (isNaN(from) || isNaN(to) || from <= 0 || to <= 0)
      return res.status(400).json({ error: "Paramètres from et to requis" });

    const [sessions] = await pool.execute(
      "SELECT cs.*, u.name as user_name FROM cash_sessions cs LEFT JOIN users u ON cs.user_id = u.id WHERE cs.opened_at >= ? AND cs.opened_at <= ? ORDER BY cs.opened_at DESC",
      [from, to],
    );

    let totalOpening = 0,
      totalClosing = 0,
      totalExpected = 0,
      totalDifference = 0,
      discrepancies = 0;
    const sessionList = sessions.map((s) => {
      totalOpening += s.opening_amount || 0;
      totalClosing += s.closing_amount || 0;
      totalExpected += s.expected_amount || 0;
      const diff = s.difference || 0;
      totalDifference += diff;
      if (diff !== 0) discrepancies++;

      return {
        id: s.id,
        userName: s.user_name || "Utilisateur",
        openingAmount: s.opening_amount,
        closingAmount: s.closing_amount,
        expectedAmount: s.expected_amount,
        difference: s.difference,
        openedAt: s.opened_at,
        closedAt: s.closed_at,
        notes: s.notes,
      };
    });

    res.json({
      data: {
        period: { from, to },
        summary: {
          totalSessions: sessions.length,
          totalOpeningAmount: totalOpening,
          totalClosingAmount: totalClosing,
          totalExpectedAmount: totalExpected,
          totalDifference,
          sessionsWithDiscrepancy: discrepancies,
        },
        sessions: sessionList,
      },
    });
  } catch (error) {
    console.error(
      "[API] GET /api/public/reports/cash-sessions - error:",
      error,
    );
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/public/reports/repairs", async (req, res) => {
  try {
    const from = parseInt(req.query.from);
    const to = parseInt(req.query.to);
    if (!from || !to)
      return res.status(400).json({ error: "Paramètres from et to requis" });

    const [repairs] = await pool.execute(
      "SELECT r.*, c.name as customer_name, u.name as technician_name FROM repairs r LEFT JOIN customers c ON r.customer_id = c.id LEFT JOIN users u ON r.technician_id = u.id WHERE r.created_at >= ? AND r.created_at <= ? ORDER BY r.created_at DESC",
      [from, to],
    );

    let totalRevenue = 0;
    const byStatus = {};
    const byTechMap = {};
    let totalDays = 0,
      completedCount = 0;

    const repairList = repairs.map((r) => {
      const cost = r.final_cost || r.estimated_cost || 0;
      if (r.status === "delivered") totalRevenue += cost;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;

      if (r.technician_id) {
        if (!byTechMap[r.technician_id])
          byTechMap[r.technician_id] = {
            technicianId: r.technician_id,
            technicianName: r.technician_name || "Technicien",
            repairCount: 0,
            totalRevenue: 0,
          };
        byTechMap[r.technician_id].repairCount++;
        if (r.status === "delivered")
          byTechMap[r.technician_id].totalRevenue += cost;
      }

      if (r.delivered_at && r.created_at) {
        totalDays += (r.delivered_at - r.created_at) / 86400;
        completedCount++;
      }

      return {
        id: r.id,
        customerName: r.customer_name,
        deviceBrand: r.device_brand,
        deviceModel: r.device_model,
        issueDescription: r.issue_description,
        status: r.status,
        estimatedCost: r.estimated_cost,
        finalCost: r.final_cost,
        technicianName: r.technician_name,
        createdAt: r.created_at,
        deliveredAt: r.delivered_at,
      };
    });

    res.json({
      data: {
        period: { from, to },
        summary: {
          totalRepairs: repairs.length,
          totalRevenue,
          averageCost:
            repairs.length > 0
              ? Math.round(totalRevenue / Math.max(completedCount, 1))
              : 0,
          averageCompletionDays:
            completedCount > 0 ? Math.round(totalDays / completedCount) : 0,
        },
        byStatus,
        byTechnician: Object.values(byTechMap),
        repairs: repairList,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/public/reports/repairs - error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// === SPA CATCH-ALL ROUTE (must be after all API routes) ===
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../dist');
  app.get('/*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  console.error("[SERVER] Express error:", err);
  res.status(500).json({ error: "Erreur serveur interne" });
});

// Start server after database connection
initDatabase().then(() => {
  const server = app.listen(PORT, () => {
    console.log(
      `\n ArouaStore Backend (TiDB Cloud) running at http://localhost:${PORT}`,
    );
    console.log(` Database: TiDB Cloud - POS`);
    console.log(`\n You are logged in as admin: kuarigama@heure-salat.com\n`);
  });
});

// Keep alive - ping toutes les 30 secondes pour eviter l'inactivite
setInterval(() => {
  // Keep the event loop active
}, 30000);
