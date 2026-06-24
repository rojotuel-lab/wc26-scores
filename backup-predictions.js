// backup-predictions.js
// Descarga TODAS las predicciones de Firestore y las guarda en este repo,
// en backups/predictions-latest.json. Al estar en git, cada ejecución crea
// un commit — así que el HISTORIAL del archivo (botón "History" en GitHub)
// es, en sí mismo, un backup completo de cada día, para siempre, gratis.

const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection("predictions").get();
  const result = {};
  snapshot.forEach(doc => { result[doc.id] = doc.data(); });

  const names = Object.keys(result);
  const total = Object.values(result).reduce((sum, p) => sum + Object.keys(p).length, 0);
  console.log(`Backed up ${names.length} participants, ${total} total predictions.`);

  fs.mkdirSync("backups", { recursive: true });
  fs.writeFileSync(
    "backups/predictions-latest.json",
    JSON.stringify({ backedUpAt: new Date().toISOString(), predictions: result }, null, 2)
  );
  console.log("✅ Written to backups/predictions-latest.json");
}

main().catch(err => {
  console.error("Backup failed:", err);
  process.exit(1);
});
