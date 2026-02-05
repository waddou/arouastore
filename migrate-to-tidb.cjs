const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const config = {
  host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "2Kkkuv3PHyG2RBg.root",
  password: "1fYFk5J50aTjVgcl",
  database: "POS",
  ssl: {
    rejectUnauthorized: true,
  },
  multipleStatements: true,
};

async function migrate() {
  console.log("Connexion a TiDB Cloud...");

  const connection = await mysql.createConnection(config);
  console.log("Connecte avec succes!");

  try {
    // Lire le fichier SQL
    const sqlFile = fs.readFileSync(
      path.join(__dirname, "tidb_migration.sql"),
      "utf8",
    );

    // Supprimer les commentaires et diviser en statements individuels
    const cleanedSql = sqlFile
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    const statements = cleanedSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Execution de ${statements.length} statements SQL...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt || stmt.startsWith("--")) continue;

      try {
        await connection.query(stmt);
        successCount++;

        // Afficher progression
        if (successCount % 10 === 0) {
          console.log(`Progression: ${successCount}/${statements.length}`);
        }
      } catch (err) {
        // Ignorer les erreurs "table already exists" et "duplicate entry"
        if (
          err.code === "ER_TABLE_EXISTS_ERROR" ||
          err.code === "ER_DUP_ENTRY" ||
          err.errno === 1050 ||
          err.errno === 1062
        ) {
          console.log(`[SKIP] ${err.message.substring(0, 60)}...`);
        } else {
          console.error(`[ERROR] ${err.message.substring(0, 80)}`);
          errorCount++;
        }
      }
    }

    console.log("\n========================================");
    console.log("Migration terminee!");
    console.log(`Succes: ${successCount}`);
    console.log(`Erreurs: ${errorCount}`);
    console.log("========================================");

    // Verifier les tables creees
    console.log("\nTables dans la base de donnees:");
    const [tables] = await connection.query("SHOW TABLES");
    tables.forEach((t) => {
      const tableName = Object.values(t)[0];
      console.log(`  - ${tableName}`);
    });
  } catch (err) {
    console.error("Erreur de migration:", err.message);
  } finally {
    await connection.end();
    console.log("\nConnexion fermee.");
  }
}

migrate().catch(console.error);
