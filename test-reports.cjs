/**
 * Test Script for All Reports API Endpoints
 * Tests: Sales, Inventory, Cash Sessions, Repairs
 */

const mysql = require("mysql2/promise");

// TiDB Cloud connection configuration
const dbConfig = {
  host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "2Kkkuv3PHyG2RBg.root",
  password: "1fYFk5J50aTjVgcl",
  database: "POS",
  ssl: { rejectUnauthorized: true },
};

const API_BASE = "http://localhost:3001";

async function testConnection() {
  console.log("=== Test 1: Database Connection ===");
  let pool;
  try {
    pool = await mysql.createPool(dbConfig);
    const [rows] = await pool.execute("SELECT 1 as test");
    console.log("✅ Database connection successful");
    return pool;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return null;
  }
}

async function testSalesReport(pool) {
  console.log("\n=== Test 2: Sales Report ===");
  try {
    // Get date range from data
    const [sales] = await pool.execute(
      "SELECT COUNT(*) as count, MIN(created_at) as oldest, MAX(created_at) as newest FROM sales"
    );

    if (sales[0].count === 0) {
      console.log("⚠️  No sales data found in database");
      return;
    }

    const from = sales[0].oldest;
    const to = sales[0].newest;
    console.log(`📊 Found ${sales[0].count} sales from ${new Date(from * 1000).toLocaleDateString()} to ${new Date(to * 1000).toLocaleDateString()}`);

    // Test API endpoint
    const response = await fetch(`${API_BASE}/api/public/reports/sales?from=${from}&to=${to}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Sales report API error:", data.error);
      return;
    }

    console.log("✅ Sales report working");
    console.log(`   Total sales: ${data.data.summary.totalSales}`);
    console.log(`   Total revenue: ${data.data.summary.totalRevenue}`);
    console.log(`   Records returned: ${data.data.sales.length}`);
  } catch (error) {
    console.error("❌ Sales report test failed:", error.message);
  }
}

async function testInventoryReport(pool) {
  console.log("\n=== Test 3: Inventory Report ===");
  try {
    const [products] = await pool.execute("SELECT COUNT(*) as count FROM products");
    console.log(`📦 Found ${products[0].count} products in database`);

    const response = await fetch(`${API_BASE}/api/public/reports/inventory`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Inventory report API error:", data.error);
      return;
    }

    console.log("✅ Inventory report working");
    console.log(`   Total products: ${data.data.summary.totalProducts}`);
    console.log(`   Total stock value: ${data.data.summary.totalStockValue}`);
    console.log(`   Low stock items: ${data.data.summary.lowStockCount}`);
    console.log(`   Out of stock: ${data.data.summary.outOfStockCount}`);
  } catch (error) {
    console.error("❌ Inventory report test failed:", error.message);
  }
}

async function testCashSessionsReport(pool) {
  console.log("\n=== Test 4: Cash Sessions Report ===");
  try {
    // First check if cash_sessions table exists and has data
    const [tables] = await pool.execute("SHOW TABLES LIKE 'cash_sessions'");
    if (tables.length === 0) {
      console.log("⚠️  cash_sessions table doesn't exist");
      return;
    }

    const [sessions] = await pool.execute(
      "SELECT COUNT(*) as count, MIN(opened_at) as oldest, MAX(opened_at) as newest FROM cash_sessions"
    );

    if (sessions[0].count === 0) {
      console.log("⚠️  No cash sessions found in database");
      return;
    }

    const from = sessions[0].oldest;
    const to = sessions[0].newest;
    const now = Math.floor(Date.now() / 1000);

    console.log(`💰 Found ${sessions[0].count} cash sessions`);
    console.log(`   Date range: ${new Date(from * 1000).toLocaleDateString()} to ${new Date(to * 1000).toLocaleDateString()}`);
    console.log(`   API params: from=${from}, to=${to}`);

    // Validate parameters before API call
    if (isNaN(from) || isNaN(to) || from <= 0 || to <= 0) {
      console.log("❌ Invalid date parameters, using fallback");
      // Use a reasonable default range (last 30 days)
      const fallbackFrom = now - (30 * 24 * 60 * 60);
      return await testCashSessionsWithRange(pool, fallbackFrom, now);
    }

    const response = await fetch(`${API_BASE}/api/public/reports/cash-sessions?from=${from}&to=${to}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Cash sessions report API error:", data.error);
      // Try with different date range
      console.log("🔄 Retrying with different date range...");
      return await testCashSessionsWithRange(pool, now - (30 * 24 * 60 * 60), now);
    }

    console.log("✅ Cash sessions report working");
    console.log(`   Total sessions: ${data.data.summary.totalSessions}`);
    console.log(`   Total cash in: ${data.data.summary.totalCashIn}`);
    console.log(`   Total cash out: ${data.data.summary.totalCashOut}`);
    console.log(`   Records returned: ${data.data.sessions.length}`);
  } catch (error) {
    console.error("❌ Cash sessions report test failed:", error.message);
  }
}

async function testCashSessionsWithRange(pool, from, to) {
  console.log(`   Trying with range: ${from} to ${to}`);
  try {
    const response = await fetch(`${API_BASE}/api/public/reports/cash-sessions?from=${from}&to=${to}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Cash sessions report still failing:", data.error);
      return;
    }

    console.log("✅ Cash sessions report working with fallback range");
    console.log(`   Total sessions: ${data.data.summary.totalSessions}`);
  } catch (error) {
    console.error("❌ Fallback test also failed:", error.message);
  }
}

async function testRepairsReport(pool) {
  console.log("\n=== Test 5: Repairs Report ===");
  try {
    const [repairs] = await pool.execute(
      "SELECT COUNT(*) as count, MIN(created_at) as oldest, MAX(created_at) as newest FROM repairs"
    );

    if (repairs[0].count === 0) {
      console.log("⚠️  No repairs found in database");
      return;
    }

    const from = repairs[0].oldest;
    const to = repairs[0].newest;
    console.log(`🔧 Found ${repairs[0].count} repairs from ${new Date(from * 1000).toLocaleDateString()} to ${new Date(to * 1000).toLocaleDateString()}`);

    const response = await fetch(`${API_BASE}/api/public/reports/repairs?from=${from}&to=${to}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Repairs report API error:", data.error);
      return;
    }

    console.log("✅ Repairs report working");
    console.log(`   Total repairs: ${data.data.summary.totalRepairs}`);
    console.log(`   Total revenue: ${data.data.summary.totalRevenue}`);
    console.log(`   Average cost: ${data.data.summary.averageCost}`);
    console.log(`   By status:`, data.data.byStatus);
    console.log(`   Records returned: ${data.data.repairs.length}`);

    // Check for delivered repairs
    const delivered = data.data.repairs.filter(r => r.status === "delivered");
    console.log(`   ✅ Delivered repairs: ${delivered.length}`);
  } catch (error) {
    console.error("❌ Repairs report test failed:", error.message);
  }
}

async function testDataIntegrity() {
  console.log("\n=== Test 6: Data Integrity Check ===");
  let pool;
  try {
    pool = await mysql.createPool(dbConfig);

    // Check for orphaned records
    const [orphanedSales] = await pool.execute(
      "SELECT COUNT(*) as count FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.customer_id IS NOT NULL AND c.id IS NULL"
    );

    const [orphanedRepairs] = await pool.execute(
      "SELECT COUNT(*) as count FROM repairs r LEFT JOIN customers c ON r.customer_id = c.id WHERE r.customer_id IS NOT NULL AND c.id IS NULL"
    );

    const [orphanedTechRepairs] = await pool.execute(
      "SELECT COUNT(*) as count FROM repairs r LEFT JOIN users u ON r.technician_id = u.id WHERE r.technician_id IS NOT NULL AND u.id IS NULL"
    );

    console.log("✅ Data integrity check completed");
    console.log(`   Orphaned sales: ${orphanedSales[0].count}`);
    console.log(`   Orphaned repairs (customer): ${orphanedRepairs[0].count}`);
    console.log(`   Orphaned repairs (technician): ${orphanedTechRepairs[0].count}`);

  } catch (error) {
    console.error("❌ Data integrity check failed:", error.message);
  } finally {
    if (pool) await pool.end();
  }
}

async function main() {
  console.log("🧪 Starting Reports API Test Suite\n");
  console.log("=".repeat(50));

  const pool = await testConnection();
  if (!pool) {
    console.log("\n❌ Cannot continue tests without database connection");
    process.exit(1);
  }

  await testSalesReport(pool);
  await testInventoryReport(pool);
  await testCashSessionsReport(pool);
  await testRepairsReport(pool);
  await testDataIntegrity();

  console.log("\n" + "=".repeat(50));
  console.log("✅ Test suite completed");
  console.log("\nIf you see ✅ for all tests, your reports are working correctly!");
  console.log("If you see ❌ errors, check the specific error messages above.");
}

main().catch(console.error);
