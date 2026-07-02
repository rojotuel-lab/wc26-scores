// update-scores.js
// Fetches FIFA World Cup 2026 scores from ESPN's free, public scoreboard
// endpoint and writes a clean JSON file into this repo. GitHub Pages serves
// it automatically as a normal static file — no external storage, no quota.
//
// For knockout matches (id >= 73), also stores rs1/rs2 = regulation-time
// score only (periods 1+2, ignoring extra time). The React app uses rs1/rs2
// for point calculations in those matches, while showing the full score
// (s1/s2) in the Partidos tab. This implements the pool rule that only
// goals scored in the first 90 minutes count from the Round of 32 onwards.

const fs = require("fs");

const MATCHES = [
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
  // Ronda de 32 — equipos reales confirmados
  {id:73,c1:"RSA",c2:"CAN"},{id:74,c1:"GER",c2:"PAR"},{id:75,c1:"NED",c2:"MAR"},
  {id:76,c1:"BRA",c2:"JPN"},{id:77,c1:"FRA",c2:"SWE"},{id:78,c1:"CIV",c2:"NOR"},
  {id:79,c1:"MEX",c2:"ECU"},{id:80,c1:"ENG",c2:"COD"},{id:81,c1:"USA",c2:"BIH"},
  {id:82,c1:"BEL",c2:"SEN"},{id:83,c1:"POR",c2:"CRO"},{id:84,c1:"ESP",c2:"AUT"},
  {id:85,c1:"SUI",c2:"ALG"},{id:86,c1:"ARG",c2:"CPV"},{id:87,c1:"COL",c2:"GHA"},
  {id:88,c1:"AUS",c2:"EGY"},
  // Octavos de Final
  {id:89,c1:"PAR",c2:"FRA"},{id:90,c1:"CAN",c2:"MAR"},
  {id:91,c1:"BRA",c2:"NOR"},{id:92,c1:"MEX",c2:"ENG"},
];

const ESPN_ALIAS = {};
function espnCodes(ourCode) {
  return [ourCode, ...(ESPN_ALIAS[ourCode] || [])];
}

// ESPN period numbers for soccer:
// 1 = first half, 2 = second half, 3 = first ET half, 4 = second ET half
// We only want periods 1+2 for regulation-time score.
function getLinescoreByPeriod(competitor, periodNumber) {
  const ls = competitor.linescores || [];
  const period = ls.find(l => l.period && l.period.number === periodNumber);
  return period ? (parseInt(period.value, 10) || 0) : null;
}

async function main() {
  const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=300&dates=20260611-20260719";
  const res = await fetch(url);
  if (!res.ok) {
    console.error("ESPN fetch failed:", res.status);
    process.exit(1);
  }
  const data = await res.json();
  const events = data.events || [];
  console.log(`ESPN returned ${events.length} events.`);

  const espnByPair = {};
  for (const ev of events) {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) continue;
    const competitors = comp.competitors || [];
    if (competitors.length !== 2) continue;
    const home = competitors.find(c => c.homeAway === "home");
    const away = competitors.find(c => c.homeAway === "away");
    if (!home || !away) continue;
    const homeAbbr = home.team && home.team.abbreviation;
    const awayAbbr = away.team && away.team.abbreviation;
    if (!homeAbbr || !awayAbbr) continue;
    const statusType = (comp.status && comp.status.type) || {};
    let st = "Programado";
    if (statusType.completed) st = "Finalizado";
    else if (statusType.state === "in") st = "En vivo";
    const key = [homeAbbr, awayAbbr].sort().join("-");
    espnByPair[key] = {
      homeAbbr, awayAbbr,
      homeScore: parseInt(home.score, 10),
      awayScore: parseInt(away.score, 10),
      st,
      homeComp: home,
      awayComp: away,
    };
  }

  const result = {};
  let matched = 0;
  for (const m of MATCHES) {
    const codes1 = espnCodes(m.c1);
    const codes2 = espnCodes(m.c2);
    let found = null;
    outer:
    for (const a of codes1) {
      for (const b of codes2) {
        const key = [a, b].sort().join("-");
        if (espnByPair[key]) { found = espnByPair[key]; break outer; }
      }
    }
    if (!found) continue;
    if (isNaN(found.homeScore) || isNaN(found.awayScore)) continue;
    if (found.st === "Programado" && found.homeScore === 0 && found.awayScore === 0) continue;

    const c1IsHome = codes1.includes(found.homeAbbr);
    const s1 = c1IsHome ? found.homeScore : found.awayScore;
    const s2 = c1IsHome ? found.awayScore : found.homeScore;

    const entry = { s1, s2, st: found.st };

    // For knockout matches (id >= 73): also store regulation-time score.
    // rs1/rs2 = sum of periods 1 and 2 only — extra time and penalties excluded.
    // This implements the pool rule: only goals in the first 90 minutes count.
    if (m.id >= 73) {
      const homeC = c1IsHome ? found.homeComp : found.awayComp;
      const awayC = c1IsHome ? found.awayComp : found.homeComp;
      const h1 = getLinescoreByPeriod(homeC, 1);
      const h2 = getLinescoreByPeriod(homeC, 2);
      const a1 = getLinescoreByPeriod(awayC, 1);
      const a2 = getLinescoreByPeriod(awayC, 2);
      // Only store rs1/rs2 if ESPN actually returned period data.
      // If linescores are missing (e.g. match not yet started), omit them
      // so the app gracefully falls back to s1/s2.
      if (h1 !== null && h2 !== null && a1 !== null && a2 !== null) {
        entry.rs1 = h1 + h2;
        entry.rs2 = a1 + a2;
      }
    }

    result[m.id] = entry;
    matched++;
  }

  console.log(`Matched ${matched} of ${MATCHES.length} matches with live/final data.`);
  fs.writeFileSync("scores.json", JSON.stringify(result));
  console.log("✅ scores.json escrito correctamente.");
}

main().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
