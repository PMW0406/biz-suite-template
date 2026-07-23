// ============================================================
// wt-consumables 데모 시드
//  - cons_cache: ilbo_acc / ilbo_pending(리치, total과 공유) / ilbo_targets / ilbo_constgt
//  - consumables_report: 'aura_cons'(리포트 스냅샷) / 'samplemall'(몰 스냅샷)
//    ※ HTML에서 키를 oligio→aura_cons, womall→samplemall 로 rename 함
// 실행: node sql/seed_consumables.js
// ============================================================
const fs=require('fs'), https=require('https');
const BASE='https://bdkurlqmfsswgeiujyev.supabase.co';
const KEY=fs.readFileSync(process.env.WT_SECRET_FILE||'C:/Users/user/Desktop/메모장.txt','utf8').trim();
function api(m,p,b,e){return new Promise((res,rej)=>{const data=b!=null?JSON.stringify(b):null;const u=new URL(BASE+p);const rq=https.request(u,{method:m,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation',...(e||{}),...(data?{'Content-Length':Buffer.byteLength(data)}:{})}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:d}));});rq.on('error',rej);if(data)rq.write(data);rq.end();});}
const rest=(m,t,b,h)=>api(m,'/rest/v1/'+t,b,h);
const rand=a=>a[Math.floor(Math.random()*a.length)], ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pad=n=>String(n).padStart(2,'0');
const HOSP=['서울미래의원','강남스킨클리닉','부산더마피부과','대구라인의원','인천뷰티클리닉','수원성형외과','청담365의원','분당에스의원','일산필의원','목동참의원'];
const CONS_GRPS=['Aura Face','Aura Eye','X/Lumi Face','X/Lumi Eye','카트리지','Cooling','Return Pad','Coupling Oil','기타'];
const DIVS=['국내제품','국내소모품','해외영업','Surgical','B2C','고객만족','기타'];

// ── cons_cache: ilbo_acc ────────────────────────────────
function buildAcc(){
  const monthly={}, consMonthly={};
  DIVS.forEach(d=>monthly[d]={});
  for(let mo=1;mo<=7;mo++){
    monthly['국내제품'][mo]=ri(15,26)*100000000;
    monthly['국내소모품'][mo]=ri(6,12)*100000000;
    monthly['해외영업'][mo]=ri(18,32)*100000000;
    monthly['Surgical'][mo]=ri(1,4)*100000000;
    consMonthly[mo]=monthly['국내소모품'][mo];
  }
  const lines=[]; for(let i=0;i<8;i++) lines.push({date:'2026-07-22',month:7,region:'국내',div:'국내소모품',customer:rand(HOSP),product:rand(['Aura Tip','Cartridge','Cooling']),qty:ri(2,20),amount:ri(50,300)*10000});
  return {reportDate:'2026-07-22',curMonth:7,monthly,consMonthly,lines,products:{국내:{},해외:{}},updatedAt:'2026-07-22',
    prev:{date:'2026-07-21',tot:ri(80,120)*100000000,cons:ri(6,12)*100000000,prod:ri(15,26)*100000000}};
}
// ── cons_cache: ilbo_pending (리치; total.html도 이 키 읽음) ──
function buildPending(){
  const rows=[];
  for(let i=0;i<8;i++){const region=i<5?'국내':'해외';
    rows.push({id:'p'+i+Math.random().toString(36).slice(2,6),region,type:'예정',country:region==='해외'?rand(['태국','미국','베트남']):'',
      customer:region==='해외'?rand(['Bangkok Clinic','LA Derm','Hanoi Skin']):rand(HOSP),product:rand(['Aura Tip','Cartridge','Aura X']),
      qty:ri(1,10),amount:ri(15,90)*1000000,expectedDate:'2026-08-'+pad(ri(3,26)),status:'대기',memo:''});}
  return {rows,updatedAt:'2026-07-22'};
}
function buildTargets(){const t={};DIVS.forEach(d=>t[d]={});for(let mo=1;mo<=7;mo++){t['국내제품'][mo]=ri(16,26)*100000000;t['국내소모품'][mo]=ri(7,12)*100000000;t['해외영업'][mo]=ri(20,32)*100000000;}return t;}
function buildConstgt(){const c={};for(let mo=1;mo<=7;mo++)c[mo]=ri(8,13)*100000000;return c;}

// ── consumables_report: 'aura_cons' (R 스냅샷) ──────────
function six(){return {label:'',today:ri(2,9)*1000000,prevDay:ri(2,9)*1000000,prevMonthAvg:ri(2,8)*1000000,ytdAvg:ri(2,8)*1000000,monthTargetAvg:ri(3,9)*1000000,lastYearAvg:ri(2,7)*1000000};}
function vs(){return {label:'',prevDay:(Math.random()*0.4-0.2),prevMonthAvg:(Math.random()*0.4-0.2),ytdAvg:(Math.random()*0.3-0.1),monthTargetAvg:(Math.random()*0.3-0.1),lastYearAvg:(Math.random()*0.4-0.1)};}
function prog(){const cum=ri(30,80)*10000000,target=ri(60,110)*10000000;return {label:'',cum,target,achieve:cum/target,progress:0.5+Math.random()*0.4,remain:Math.max(0,target-cum)};}
function buildAura(){
  return {date:'2026-07-22',
    daily:{domestic:{...six(),label:'국내'},overseas:{...six(),label:'해외'},total:{...six(),label:'전체'},vsDom:vs(),vsInt:vs(),vsTot:vs()},
    progress:{domestic:{...prog(),label:'국내'},overseas:{...prog(),label:'해외'},total:{...prog(),label:'전체'}},
    hospitals:HOSP.slice(0,8).map(n=>({name:n,xF:ri(0,3),xE:ri(0,2),oF:ri(0,4),oE:ri(0,2),tip:ri(30,300)*10000})),
    hospTotal:{xF:8,xE:4,oF:10,oE:5,tip:12000000},
    products:CONS_GRPS.slice(0,6).map((g,i)=>({grp:g,item:g+' 팁',qToday:ri(0,5),qPrev:ri(0,5),qCum:ri(10,60),qLast:ri(8,50),amtToday:ri(10,80)*10000,amtCum:ri(200,900)*10000,amtLast:ri(150,800)*10000})),
    trend:{daily:{header:[45900,45901,45902,45903,45904],rows:[{label:'국내',vals:[ri(1,9),ri(1,9),ri(1,9),ri(1,9),ri(1,9)]},{label:'해외',vals:[ri(1,9),ri(1,9),ri(1,9),ri(1,9),ri(1,9)]}]},
      weekly:{header:['W1','W2','W3','W4','W5','W6'],rows:[{label:'국내',vals:Array.from({length:6},()=>ri(20,60))}]},
      yearly:{header:['1월','2월','3월','4월','5월','6월','7월'],rows:[{label:'국내',vals:Array.from({length:7},()=>ri(100,300))}]}},
    topAccounts:HOSP.slice(0,6).map(n=>({name:n,cur:ri(50,200)*10000,prior:ri(40,180)*10000,vs:(Math.random()*0.6-0.2),priorYear:ri(40,220)*10000})),
    charts:[{title:'국내 Aura X, Lumi Tip 월 판매량 (출고기준)',actual:Array.from({length:12},(_,i)=>i<7?ri(5,30):null),prior:Array.from({length:12},()=>ri(5,28)),target:Array.from({length:12},()=>ri(8,32)),color:'#f97316'}],
    uploadedAt:'2026-07-22T09:00:00.000Z'};
}
// ── consumables_report: 'samplemall' (W 스냅샷) ─────────
function buildMall(){
  const byGrp=CONS_GRPS.map(n=>({name:n,qty:ri(20,150),amt:ri(300,1500)*10000}));
  return {type:'womall',period:{from:'2026-07-01',to:'2026-07-22'},
    orders:ri(80,180),totAmt:byGrp.reduce((s,g)=>s+g.amt,0),totQty:byGrp.reduce((s,g)=>s+g.qty,0),cancAmt:ri(50,200)*10000,cancN:ri(2,8),
    byGrp,
    byProduct:Array.from({length:12},(_,i)=>({name:rand(CONS_GRPS)+' 상세'+i,grp:rand(CONS_GRPS),qty:ri(5,60),amt:ri(50,500)*10000})).sort((a,b)=>b.amt-a.amt),
    byHosp:HOSP.map(n=>({name:n,grp:undefined,qty:ri(5,50),amt:ri(50,400)*10000})).sort((a,b)=>b.amt-a.amt),
    byMonth:[1,2,3,4,5,6,7].map(mo=>({ym:'2026-'+pad(mo),amt:ri(300,900)*100000,qty:ri(200,700),grps:{'Aura Face':ri(50,200)*10000}})),
    uploadedAt:'2026-07-22T09:00:00.000Z'};
}
module.exports={buildAcc,buildPending,buildTargets,buildConstgt,buildAura,buildMall};
if(require.main!==module) return;
async function putCC(key,data){await rest('DELETE','cons_cache?key=eq.'+encodeURIComponent(key));const r=await rest('POST','cons_cache',{key,data,updated_at:new Date().toISOString()});console.log('  cons_cache['+key+'] ->',r.status,r.status>=300?r.body.slice(0,160):'');}
async function putCR(key,data){await rest('DELETE','consumables_report?key=eq.'+encodeURIComponent(key));const r=await rest('POST','consumables_report',{key,data,updated_at:new Date().toISOString()});console.log('  consumables_report['+key+'] ->',r.status,r.status>=300?r.body.slice(0,160):'');}
(async()=>{
  console.log('== consumables 시드 ==');
  await putCC('ilbo_acc',buildAcc());
  await putCC('ilbo_pending',buildPending());   // total.html과 공유(리치 shape로 override)
  await putCC('ilbo_targets',buildTargets());
  await putCC('ilbo_constgt',buildConstgt());
  await putCR('aura_cons',buildAura());
  await putCR('samplemall',buildMall());
  // access 에 'daily' 추가
  const q=await rest('GET','crm_profiles?select=id,access'); let list=[];try{list=JSON.parse(q.body);}catch(_){}
  for(const p of list){const acc=new Set(String(p.access||'').split(',').map(s=>s.trim()).filter(Boolean));acc.add('daily');await rest('PATCH','crm_profiles?id=eq.'+p.id,{access:Array.from(acc).join(',')});}
  console.log('  crm_profiles +daily ->',list.length,'명');
})().catch(e=>{console.error(e);process.exit(1);});
