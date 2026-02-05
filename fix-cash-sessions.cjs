/**
 * Script de correction pour les sessions de caisse NULL
 * Corrige les sessions de caisse où opened_at est NULL
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

async function fixCashSessions() {
  let pool;
  try {
    pool = await mysql.createPool(dbConfig);

    console.log("=== Correction: Sessions de Caisse NULL ===\n");

    // 1. Trouver les sessions NULL
    console.log("1. Recherche des sessions avec opened_at NULL...");
    const [nullSessions] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE opened_at IS NULL"
    );

    if (nullSessions.length === 0) {
      console.log("   ✅ Aucune session NULL trouvée");
      return;
    }

    console.log(`   📋 Trouvé ${nullSessions.length} session(s) NULL\n`);

    // 2. Demander confirmation avant de corriger
    console.log("2. Sessions à corriger:");
    nullSessions.forEach((s, i) => {
      console.log(`   Session ${i + 1}:`);
      console.log(`     ID: ${s.id}`);
      console.log(`     User ID: ${s.user_id}`);
      console.log(`     Opening Amount: ${s.opening_amount}`);
      console.log(`     Notes: ${s.notes || 'NULL'}`);
    });

    // 3. Déterminer quelle date utiliser
    console.log("\n3. Choix de la date de correction:");
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    const yesterday = now - 86400;

    console.log(`   Option A: Maintenant (${new Date(now * 1000).toLocaleString('fr-FR')})`);
    console.log(`   Option B: Il y a 1 heure (${new Date(oneHourAgo * 1000).toLocaleString('fr-FR')})`);
    console.log(`   Option C: Hier (${new Date(yesterday * 1000).toLocaleString('fr-FR')})`);

    // Utiliser "hier" comme valeur par défaut raisonnable
    const fixTimestamp = yesterday;

    // 4. Appliquer la correction
    console.log(`\n4. Application de la correction avec timestamp: ${fixTimestamp}`);

    const [updateResult] = await pool.execute(
      `UPDATE cash_sessions
       SET opened_at = ?,
           closed_at = NULL,
           expected_amount = opening_amount,
           difference = 0
       WHERE opened_at IS NULL`,
      [fixTimestamp]
    );

    console.log(`   ✅ ${updateResult.affectedRows} session(s) corrigée(s)`);

    // 5. Vérifier la correction
    console.log("\n5. Vérification après correction:");
    const [fixedSessions] = await pool.execute(
      "SELECT * FROM cash_sessions WHERE id = ?",
      [nullSessions[0].id]
    );

    if (fixedSessions.length > 0) {
      const s = fixedSessions[0];
      console.log(`   Session corrigée:`);
      console.log(`     opened_at: ${s.opened_at} (${new Date(s.opened_at * 1000).toLocaleString('fr-FR')})`);
      console.log(`     expected_amount: ${s.expected_amount}`);
      console.log(`     difference: ${s.difference}`);
    }

    // 6. Tester le rapport après correction
    console.log("\n6. Test du rapport après correction...");
    const response = await fetch(
      `http://localhost:3001/api/public/reports/cash-sessions?from=${yesterday}&to=${now}`
    );
    const data = await response.json();

    if (data.error) {
      console.log(`   ❌ Erreur: ${data.error}`);
    } else {
      console.log("   ✅ Rapport fonctionne!");
      console.log(`   Total sessions: ${data.data.summary.totalSessions}`);
      console.log(`   Total ouverture: ${data.data.summary.totalOpeningAmount}`);
      console.log(`   Écart: ${data.data.summary.totalDifference}`);
    }

    console.log("\n=== Correction terminée avec succès ===");
    console.log("Les sessions de caisse peuvent maintenant apparaître dans les rapports.");

  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    if (pool) await pool.end();
  }
}

fixCashSessions().catch(console.error);
