// update-knockout-teams.js
// Calcula automáticamente qué equipo real ocupa cada cupo "1° Grupo X" o
// "2° Grupo X" de la Ronda de 32, usando los marcadores que ya tenemos en
// scores.json (no depende de ninguna fuente externa nueva). Los cupos de
// "Mejor 3°" (los 8 mejores terceros) son demasiado complejos para calcular
// con seguridad de forma automática — esos se quedan para el editor manual
// (admin_knockout_teams.html), tal como se decidió.

const fs = require("fs");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Las 72 partidos de fase de grupos: id + código de cada equipo.
const GROUP_MATCHES = [
  {id:1,c1:"MEX",c2:"RSA"},{id:2,c1:"KOR",c2:"CZE"},{id:3,c1:"CAN",c2:"BIH"},
  {id:4,c1:"USA",c2:"PAR"},{id:5,c1:"QAT",c2:"SUI"},{id:6,c1:"BRA",c2:"MAR"},
  {id:7,c1:"HAI",c2:"SCO"},{id:8,c1:"AUS",c2:"TUR"},{id:9,c1:"GER",c2:"CUW"},
  {id:10,c1:"NED",c2:"JPN"},{id:11,c1:"CIV",c2:"ECU"},{id:12,c1:"SWE",c2:"TUN"},
  {id:13,c1:"ESP",c2:"CPV"},{id:14,c1:"BEL",c2:"EGY"},{id:15,c1:"KSA",c2:"URU"},
  {id:16,c1:"IRN",c2:"NZL"},{id:17,c1:"FRA",c2:"SEN"},{id:18,c1:"IRQ",c2:"NOR"},
  {id:19,c1:"ARG",c2:"ALG"},{id:20,c1:"AUT",c2:"JOR"},{id:21,c1:"POR",c2:"COD"},
  {id:22,c1:"ENG",c2:"CRO"},{id:23,c1:"GHA",c2:"PAN"},{id:24,c1:"UZB",c2:"COL"},
  {id:25,c1:"CZE",c2:"RSA"},{id:26,c1:"SUI",c2:"BIH"},{id:27,c1:"CAN",c2:"QAT"},
  {id:28,c1:"MEX",c2:"KOR"},{id:29,c1:"USA",c2:"AUS"},{id:30,c1:"SCO",c2:"MAR"},
  {id:31,c1:"BRA",c2:"HAI"},{id:32,c1:"TUR",c2:"PAR"},{id:33,c1:"NED",c2:"SWE"},
  {id:34,c1:"GER",c2:"CIV"},{id:35,c1:"ECU",c2:"CUW"},{id:36,c1:"TUN",c2:"JPN"},
  {id:37,c1:"ESP",c2:"KSA"},{id:38,c1:"BEL",c2:"IRN"},{id:39,c1:"URU",c2:"CPV"},
  {id:40,c1:"NZL",c2:"EGY"},{id:41,c1:"ARG",c2:"AUT"},{id:42,c1:"FRA",c2:"IRQ"},
  {id:43,c1:"NOR",c2:"SEN"},{id:44,c1:"JOR",c2:"ALG"},{id:45,c1:"POR",c2:"UZB"},
  {id:46,c1:"ENG",c2:"GHA"},{id:47,c1:"PAN",c2:"CRO"},{id:48,c1:"COL",c2:"COD"},
  {id:49,c1:"SUI",c2:"CAN"},{id:50,c1:"BIH",c2:"QAT"},{id:51,c1:"SCO",c2:"BRA"},
  {id:52,c1:"MAR",c2:"HAI"},{id:53,c1:"CZE",c2:"MEX"},{id:54,c1:"RSA",c2:"KOR"},
  {id:55,c1:"ECU",c2:"GER"},{id:56,c1:"CUW",c2:"CIV"},{id:57,c1:"TUN",c2:"NED"},
  {id:58,c1:"JPN",c2:"SWE"},{id:59,c1:"TUR",c2:"USA"},{id:60,c1:"PAR",c2:"AUS"},
  {id:61,c1:"NOR",c2:"FRA"},{id:62,c1:"SEN",c2:"IRQ"},{id:63,c1:"URU",c2:"ESP"},
  {id:64,c1:"CPV",c2:"KSA"},{id:65,c1:"NZL",c2:"BEL"},{id:66,c1:"EGY",c2:"IRN"},
  {id:67,c1:"PAN",c2:"ENG"},{id:68,c1:"CRO",c2:"GHA"},{id:69,c1:"COL",c2:"POR"},
  {id:70,c1:"COD",c2:"UZB"},{id:71,c1:"JOR",c2:"ARG"},{id:72,c1:"ALG",c2:"AUT"},
];

// Asignación OFICIAL de grupos, confirmada directamente (no derivada ni
// adivinada) contra la tabla de clasificación pública del Mundial 2026.
const GROUPS = {
  A: ["MEX","RSA","KOR","CZE"],
  B: ["SUI","CAN","BIH","QAT"],
  C: ["BRA","MAR","SCO","HAI"],
  D: ["USA","AUS","PAR","TUR"],
  E: ["GER","CIV","ECU","CUW"],
  F: ["NED","JPN","SWE","TUN"],
  G: ["EGY","IRN","BEL","NZL"],
  H: ["ESP","URU","CPV","KSA"],
  I: ["FRA","NOR","SEN","IRQ"],
  J: ["ARG","AUT","ALG","JOR"],
  K: ["COL","POR","COD","UZB"],
  L: ["ENG","GHA","CRO","PAN"],
};

const TEAM_NAMES = {
  MEX:"México",RSA:"Sudáfrica",KOR:"Corea del Sur",CZE:"Chequia",
  CAN:"Canadá",BIH:"Bosnia y Herzegovina",USA:"Estados Unidos",PAR:"Paraguay",
  QAT:"Catar",SUI:"Suiza",BRA:"Brasil",MAR:"Marruecos",
  HAI:"Haití",SCO:"Escocia",AUS:"Australia",TUR:"Turquía",
  GER:"Alemania",CUW:"Curazao",NED:"Países Bajos",JPN:"Japón",
  CIV:"Costa de Marfil",ECU:"Ecuador",SWE:"Suecia",TUN:"Túnez",
  ESP:"España",CPV:"Cabo Verde",BEL:"Bélgica",EGY:"Egipto",
  KSA:"Arabia Saudí",URU:"Uruguay",IRN:"Irán",NZL:"Nueva Zelanda",
  FRA:"Francia",SEN:"Senegal",IRQ:"Irak",NOR:"Noruega",
  ARG:"Argentina",ALG:"Argelia",AUT:"Austria",JOR:"Jordania",
  POR:"Portugal",COD:"RD Congo",ENG:"Inglaterra",CRO:"Croacia",
  GHA:"Ghana",PAN:"Panamá",UZB:"Uzbekistán",COL:"Colombia",
};

// Qué slot (1° o 2° de qué grupo) necesita cada lado de cada partido de
// Ronda de 32. Los lados que dependen de "Mejor 3°" se omiten a propósito
// — esos se resuelven a mano en admin_knockout_teams.html.
const SLOTS = {
  73: { t1:{rank:1,group:"A"}, t2:{rank:2,group:"B"} },
  74: { t1:{rank:1,group:"C"}, t2:{rank:2,group:"F"} },
  75: { t1:{rank:1,group:"E"} },
  76: { t1:{rank:1,group:"F"}, t2:{rank:2,group:"C"} },
  77: { t1:{rank:2,group:"E"}, t2:{rank:2,group:"I"} },
  78: { t1:{rank:1,group:"I"} },
  79: { t1:{rank:1,group:"A"} },
  80: { t1:{rank:1,group:"L"} },
  81: { t1:{rank:1,group:"G"} },
  82: { t1:{rank:1,group:"D"} },
  83: { t1:{rank:1,group:"H"}, t2:{rank:2,group:"J"} },
  84: { t1:{rank:2,group:"K"}, t2:{rank:2,group:"L"} },
  85: { t1:{rank:1,group:"B"} },
  86: { t1:{rank:2,group:"D"}, t2:{rank:2,group:"G"} },
  87: { t1:{rank:1,group:"J"}, t2:{rank:2,group:"H"} },
  88: { t1:{rank:1,group:"K"} },
};

function computeStandings(groupCode, scores) {
  const teams = GROUPS[groupCode];
  const matches = GROUP_MATCHES.filter(m => teams.includes(m.c1) && teams.includes(m.c2));
  if (matches.length !== 6) {
    console.error(`Grupo ${groupCode}: se esperaban 6 partidos, se encontraron ${matches.length}.`);
    return null;
  }
  // Solo calculamos si las 6 ya están confirmadas como Finalizado.
  for (const m of matches) {
    const s = scores[m.id];
    if (!s || s.st !== "Finalizado" || s.s1 == null || s.s2 == null) return null;
  }
  const table = {};
  teams.forEach(t => { table[t] = { code: t, pts: 0, gf: 0, ga: 0 }; });
  for (const m of matches) {
    const s = scores[m.id];
    const a = table[m.c1], b = table[m.c2];
    a.gf += s.s1; a.ga += s.s2;
    b.gf += s.s2; b.ga += s.s1;
    if (s.s1 > s.s2) a.pts += 3;
    else if (s.s1 < s.s2) b.pts += 3;
    else { a.pts += 1; b.pts += 1; }
  }
  // Criterio FIFA: puntos, luego diferencia de goles, luego goles a favor.
  // (No incluye enfrentamiento directo ni fair play — casos raros de triple
  // empate exacto en estos tres criterios no se resuelven aquí; en ese caso
  // revisa y ajusta a mano en admin_knockout_teams.html.)
  const ranked = Object.values(table).sort((x, y) =>
    (y.pts - x.pts) || ((y.gf - y.ga) - (x.gf - x.ga)) || (y.gf - x.gf)
  );
  return ranked; // [1º, 2º, 3º, 4º]
}

async function main() {
  const scores = JSON.parse(fs.readFileSync("scores.json", "utf-8"));

  const standingsByGroup = {};
  for (const g of Object.keys(GROUPS)) {
    standingsByGroup[g] = computeStandings(g, scores);
  }

  const updates = {};
  let resolvedCount = 0;

  for (const [matchId, sides] of Object.entries(SLOTS)) {
    const entry = {};
    for (const [side, slot] of Object.entries(sides)) {
      const standings = standingsByGroup[slot.group];
      if (!standings) continue; // ese grupo aún no está completo
      const code = standings[slot.rank - 1].code;
      entry[side] = code; // guardamos solo el código por ahora
    }
    if (Object.keys(entry).length > 0) {
      const field = {};
      if (entry.t1) { field.t1 = TEAM_NAMES[entry.t1]; field.c1 = entry.t1; }
      if (entry.t2) { field.t2 = TEAM_NAMES[entry.t2]; field.c2 = entry.t2; }
      updates[matchId] = field;
      resolvedCount++;
      console.log(`Partido ${matchId}: ${JSON.stringify(field)}`);
    }
  }

  if (resolvedCount === 0) {
    console.log("Ningún grupo nuevo completado todavía — nada que actualizar.");
    return;
  }

  // merge:true a nivel de cada partido individual, para no pisar lo que ya
  // se haya puesto a mano en admin_knockout_teams.html (ej. un lado "Mejor
  // 3°" ya resuelto manualmente para ese mismo partido).
  const docRef = db.collection("knockout_overrides").doc("teams");
  const current = (await docRef.get()).data() || {};
  const merged = {};
  for (const [matchId, field] of Object.entries(updates)) {
    merged[matchId] = { ...(current[matchId] || {}), ...field };
  }
  await docRef.set(merged, { merge: true });
  console.log(`✅ ${resolvedCount} partido(s) actualizados en knockout_overrides.`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
