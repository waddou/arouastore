/**
 * Script de diagnostic pour les sessions de caisse
 * Vérifie pourquoi opened_at est NULL
 */

const mysql = require("mysql2/promise");

const dbConfig = {
  host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "2Kkkuv3PHyG2RBg.root",
  password: "1fYFk5J50aTjVgcl",
  database: "POS",
  ssl: { rejectUnauthorized: true },
};

async function checkCashSessions() {
  let pool;
  try {
    pool = await mysql.createPool(dbConfig);

    console.log("=== Diagnostic: Sessions de Caisse ===\n");

    // 1. Structure de la table
    console.log("1. Structure de la table:");
    const [columns] = await pool.execute("DESCRIBE cash_sessions");
    columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} (Null: ${col.Null}, Default: ${col.Default})`);
    });

    // 2. Toutes les données
    console.log("\n2. Données dans cash_sessions:");
    const [sessions] = await pool.execute("SELECT * FROM cash_sessions");

    if (sessions.length === 0) {
      console.log("   Aucune session trouvée!");
    } else {
      sessions.forEach((s, i) => {
        console.log(`   Session ${i + 1}:`);
        console.log(`     id: ${s.id}`);
        console.log(`     user_id: ${s.user_id}`);
        console.log(`     opened_at: ${s.opened_at} (${s.opened_at ? new Date(s.opened_at * 1000).toLocaleString() : 'NULL'})`);
        console.log(`     closed_at: ${s.closed_at} (${s.closed_at ? new Date(s.closed_at * 1000).toLocaleString() : 'NULL'})`);
        console.log(`     opening_amount: ${s.opening_amount}`);
        console.log(`     closing_amount: ${s.closing_amount}`);
        console.log(`     expected_amount: ${s.expected_amount}`);
        console.log(`     difference: ${s.difference}`);
        console.log(`     notes: ${s.notes}`);
      });
    }

    // 3. Compter les NULL
    console.log("\n3. Valeurs NULL:");
    const [nullCount] = await pool.execute(
      "SELECT COUNT(*) as count FROM cash_sessions WHERE opened_at IS NULL"
    );
    console.log(`   Sessions avec opened_at NULL: ${nullCount[0].count}`);

    // 4. Vérifier les users
    console.log("\n4. Vérification des utilisateurs:");
    const [users] = await pool.execute("SELECT id, name FROM users");
    console.log(`   Utilisateurs trouvés: ${users.length}`);
    users.forEach(u => {
      console.log(`   - ID: ${u.id}, Name: ${u.name}`);
    });

    // 5. Vérifier le user_id de la session
    if (sessions.length > 0) {
      const session = sessions[0];
      const [userCheck] = await pool.execute(
        "SELECT * FROM users WHERE id = ?",
        [session.user_id]
      );
      console.log("\n5. User de la session:");
      if (userCheck.length > 0) {
        console.log(`   ✅ User existe: ${userCheck[0].name}`);
      } else {
        console.log(`   ❌ User ID ${session.user_id} n'existe pas dans la table users`);
      }
    }

    console.log("\n=== Fin du diagnostic ===");

  } catch (error) {
    console.error("Erreur:", error.message);
  } finally {
    if (pool) await pool.end();
  }
}

checkCashSessions().catch(console.error);
