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
  {id:73,c1:"RSA",c2:"CAN"},{id:74,c1:"GER",c2:"PAR"},{id:75,c1:"NED",c2:"MAR"},
  {id:76,c1:"BRA",c2:"JPN"},{id:77,c1:"FRA",c2:"SWE"},{id:78,c1:"CIV",c2:"NOR"},
  {id:79,c1:"MEX",c2:"ECU"},{id:80,c1:"ENG",c2:"COD"},{id:81,c1:"USA",c2:"BIH"},
  {id:82,c1:"BEL",c2:"SEN"},{id:83,c1:"POR",c2:"CRO"},{id:84,c1:"ESP",c2:"AUT"},
  {id:85,c1:"SUI",c2:"ALG"},{id:86,c1:"ARG",c2:"CPV"},{id:87,c1:"COL",c2:"GHA"},
  {id:88,c1:"AUS",c2:"EGY"},
  {id:89,c1:"PAR",c2:"FRA"},{id:90,c1:"CAN",c2:"MAR"},
  {id:91,c1:"BRA",c2:"NOR"},{id:92,c1:"MEX",c2:"ENG"},
  {id:93,c1:"POR",c2:"ESP"},{id:94,c1:"USA",c2:"BEL"},
  {id:95,c1:"ARG",c2:"EGY"},{id:96,c1:"SUI",c2:"COL"},
];

const ESPN_ALIAS = {};
function espnCodes(c){ return [c,...(ESPN_ALIAS[c]||[])]; }

async function main(){
  // match_overrides.json — optional. Use admin_pool_scores.html to generate it.
  // Supports: ps1/ps2 (pool score for points) and s1/s2/st (fix stuck ESPN data).
  let overrides={};
  try{
    overrides=JSON.parse(fs.readFileSync("match_overrides.json","utf-8"));
    console.log(`Overrides:`,JSON.stringify(overrides));
  }catch(e){ console.log("No match_overrides.json — ESPN only."); }

  const url="https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=300&dates=20260611-20260719";
  const res=await fetch(url);
  if(!res.ok){console.error("ESPN failed:",res.status);process.exit(1);}
  const data=await res.json();
  const events=data.events||[];
  console.log(`ESPN: ${events.length} events`);

  const byPair={};
  for(const ev of events){
    const comp=ev.competitions?.[0];
    if(!comp) continue;
    const home=comp.competitors?.find(c=>c.homeAway==="home");
    const away=comp.competitors?.find(c=>c.homeAway==="away");
    if(!home||!away) continue;
    const ha=home.team?.abbreviation,aa=away.team?.abbreviation;
    if(!ha||!aa) continue;
    const t=comp.status?.type||{};
    let st="Programado";
    if(t.completed) st="Finalizado";
    else if(t.state==="in") st="En vivo";
    byPair[[ha,aa].sort().join("-")]={ha,aa,hs:parseInt(home.score,10),as:parseInt(away.score,10),st};
  }

  const result={};
  let matched=0;
  for(const m of MATCHES){
    const c1s=espnCodes(m.c1),c2s=espnCodes(m.c2);
    let found=null;
    outer: for(const a of c1s) for(const b of c2s){
      const f=byPair[[a,b].sort().join("-")];
      if(f){found=f;break outer;}
    }
    let entry=null;
    if(found&&!isNaN(found.hs)&&!isNaN(found.as)){
      if(!(found.st==="Programado"&&found.hs===0&&found.as===0)){
        const c1Home=c1s.includes(found.ha);
        entry={s1:c1Home?found.hs:found.as,s2:c1Home?found.as:found.hs,st:found.st};
        matched++;
      }
    }
    const ov=overrides[String(m.id)];
    if(ov){
      if(!entry){entry={s1:0,s2:0,st:"Programado"};matched++;}
      if(ov.s1!=null) entry.s1=ov.s1;
      if(ov.s2!=null) entry.s2=ov.s2;
      if(ov.st!=null) entry.st=ov.st;
      if(ov.ps1!=null) entry.ps1=ov.ps1;
      if(ov.ps2!=null) entry.ps2=ov.ps2;
      console.log(`Match ${m.id} override →`,JSON.stringify(entry));
    }
    if(entry) result[m.id]=entry;
  }

  console.log(`Matched ${matched}/${MATCHES.length}`);
  fs.writeFileSync("scores.json",JSON.stringify(result));
  console.log("✅ scores.json written.");
}
main().catch(err=>{console.error(err);process.exit(1);});
