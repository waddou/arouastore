const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'arouastore.db');
const db = new Database(dbPath);

// Helper to parse CSV
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || null;
    });
    rows.push(row);
  }

  return rows;
}

// Clear existing data (except user_roles)
console.log('Clearing existing data...');
db.exec('DELETE FROM sale_items');
db.exec('DELETE FROM sales');
db.exec('DELETE FROM repairs');
db.exec('DELETE FROM cash_sessions');
db.exec('DELETE FROM products');
db.exec('DELETE FROM customers');
db.exec('DELETE FROM users WHERE id > 1');

// Import users
console.log('Importing users...');
const usersCSV = fs.readFileSync(path.join(__dirname, '../csv/users.csv'), 'utf8');
const users = parseCSV(usersCSV);
const insertUser = db.prepare('INSERT OR REPLACE INTO users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)');
for (const u of users) {
  insertUser.run(u.id, u.name, u.email, u.role, u.created_at || Math.floor(Date.now()/1000));
}
console.log(`  Imported ${users.length} users`);

// Import customers
console.log('Importing customers...');
const customersCSV = fs.readFileSync(path.join(__dirname, '../csv/customers.csv'), 'utf8');
const customers = parseCSV(customersCSV);
const insertCustomer = db.prepare('INSERT OR REPLACE INTO customers (id, phone, name, first_visit, total_spent, created_at) VALUES (?, ?, ?, ?, ?, ?)');
for (const c of customers) {
  insertCustomer.run(c.id, c.phone, c.name, c.first_visit, c.total_spent || 0, c.created_at);
}
console.log(`  Imported ${customers.length} customers`);

// Import products
console.log('Importing products...');
const productsCSV = fs.readFileSync(path.join(__dirname, '../csv/products.csv'), 'utf8');
const products = parseCSV(productsCSV);
const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO products (id, sku, name, category, brand, model, price_purchase, price_sale, stock, alert_threshold, image_url, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const p of products) {
  insertProduct.run(
    p.id, p.sku, p.name, p.category, p.brand || null, p.model || null,
    p.price_purchase || 0, p.price_sale || 0, p.stock || 0, p.alert_threshold || 5,
    p.image_url || null, p.is_active || 1, p.created_at, p.updated_at
  );
}
console.log(`  Imported ${products.length} products`);

// Import repairs
console.log('Importing repairs...');
const repairsCSV = fs.readFileSync(path.join(__dirname, '../csv/repairs.csv'), 'utf8');
const repairs = parseCSV(repairsCSV);
const insertRepair = db.prepare(`
  INSERT OR REPLACE INTO repairs (id, customer_id, device_brand, device_model, device_variant, device_password, physical_state, issue_description, diagnosis, status, estimated_cost, final_cost, technician_id, promised_date, delivered_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const r of repairs) {
  insertRepair.run(
    r.id, r.customer_id, r.device_brand, r.device_model,
    r.device_variant || null, r.device_password || null, r.physical_state || null,
    r.issue_description, r.diagnosis || null, r.status || 'new',
    r.estimated_cost || 0, r.final_cost || null, r.technician_id || null,
    r.promised_date || null, r.delivered_at || null, r.created_at, r.updated_at
  );
}
console.log(`  Imported ${repairs.length} repairs`);

// Import sales
console.log('Importing sales...');
const salesCSV = fs.readFileSync(path.join(__dirname, '../csv/sales.csv'), 'utf8');
const sales = parseCSV(salesCSV);
const insertSale = db.prepare(`
  INSERT OR REPLACE INTO sales (id, customer_id, user_id, total, discount, payment_method, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const s of sales) {
  insertSale.run(
    s.id, s.customer_id || null, s.user_id || 1, s.total || 0,
    s.discount || 0, s.payment_method || 'cash', s.status || 'completed', s.created_at
  );
}
console.log(`  Imported ${sales.length} sales`);

// Import sale_items
console.log('Importing sale items...');
const saleItemsCSV = fs.readFileSync(path.join(__dirname, '../csv/sale_items.csv'), 'utf8');
const saleItems = parseCSV(saleItemsCSV);
const insertSaleItem = db.prepare(`
  INSERT OR REPLACE INTO sale_items (id, sale_id, product_id, quantity, unit_price, subtotal)
  VALUES (?, ?, ?, ?, ?, ?)
`);
for (const si of saleItems) {
  insertSaleItem.run(si.id, si.sale_id, si.product_id, si.quantity || 1, si.unit_price, si.subtotal);
}
console.log(`  Imported ${saleItems.length} sale items`);

// Import cash_sessions
console.log('Importing cash sessions...');
const cashSessionsCSV = fs.readFileSync(path.join(__dirname, '../csv/cash_sessions.csv'), 'utf8');
const cashSessions = parseCSV(cashSessionsCSV);
const insertCashSession = db.prepare(`
  INSERT OR REPLACE INTO cash_sessions (id, user_id, opening_amount, closing_amount, expected_amount, difference, opened_at, closed_at, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const cs of cashSessions) {
  insertCashSession.run(
    cs.id, cs.user_id || 1, cs.opening_amount || 0,
    cs.closing_amount || null, cs.expected_amount || null, cs.difference || null,
    cs.opened_at, cs.closed_at || null, cs.notes || null
  );
}
console.log(`  Imported ${cashSessions.length} cash sessions`);

console.log('\n✅ Import completed successfully!');
console.log('\nSummary:');
console.log(`  - ${users.length} users`);
console.log(`  - ${customers.length} customers`);
console.log(`  - ${products.length} products`);
console.log(`  - ${repairs.length} repairs`);
console.log(`  - ${sales.length} sales`);
console.log(`  - ${saleItems.length} sale items`);
console.log(`  - ${cashSessions.length} cash sessions`);

db.close();
