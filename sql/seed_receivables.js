// ============================================================
// wt-receivables 데모 시드: cons_cache 'ar_kr'(+'ar_kr_edits'={})
// 실행: node sql/seed_receivables.js
// ============================================================
const fs=require('fs'), https=require('https');
const BASE='https://bdkurlqmfsswgeiujyev.supabase.co';
const KEY=fs.readFileSync(process.env.WT_SECRET_FILE||'C:/Users/user/Desktop/메모장.txt','utf8').trim();
function api(m,p,b,e){return new Promise((res,rej)=>{const data=b!=null?JSON.stringify(b):null;const u=new URL(BASE+p);const rq=https.request(u,{method:m,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation',...(e||{}),...(data?{'Content-Length':Buffer.byteLength(data)}:{})}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:d}));});rq.on('error',rej);if(data)rq.write(data);rq.end();});}
const rest=(m,t,b,h)=>api(m,'/rest/v1/'+t,b,h);
const rand=a=>a[Math.floor(Math.random()*a.length)], ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const pad=n=>String(n).padStart(2,'0');

const HOSP_PRE=['서울','강남','부산','대구','인천','수원','성남','대전','광주','울산','청담','분당','일산','목동','송도','평촌','제주','창원'];
const HOSP_SUF=['미래의원','스킨클리닉','더마피부과','라인의원','뷰티클리닉','성형외과','365의원','에스의원','필의원','참의원'];
const MGRS=['김서연','이준호','박도윤','최지우','정하은','강민재','윤채원'];
const TYPES=['정상채권','지연채권','장기체납채권','회수불가채권'];
const uid=(()=>{let n=0;return p=>p+(n++)+Math.random().toString(36).slice(2,7);})();
function daysAgo(d){const t=new Date('2026-07-17');t.setDate(t.getDate()-d);return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());}

function typeByAge(days,ar){
  if(days>=1096) return Math.random()<0.5?'회수불가채권':'장기체납채권';
  if(days>=366) return '장기체납채권';
  if(days>=120) return '지연채권';
  return '정상채권';
}
function buildRows(n){
  const rows=[];
  for(let i=0;i<n;i++){
    const name=rand(HOSP_PRE)+rand(HOSP_SUF)+(i+1);
    const age=[ri(10,150),ri(150,360),ri(360,1000),ri(1096,2200)][Math.floor(Math.random()*4)];
    const saleDate=daysAgo(age);
    const amt=ri(3,60)*1000000;
    const collRatio=age>1000?Math.random()*0.3:age>360?0.2+Math.random()*0.5:0.5+Math.random()*0.5;
    const coll=Math.round(amt*collRatio/10000)*10000;
    const ar=amt-coll;
    const type=typeByAge(age,ar);
    const prov=Math.round(ar*(type==='회수불가채권'?0.9:type==='장기체납채권'?0.5:type==='지연채권'?0.2:0.05)/10000)*10000;
    const year=saleDate.slice(0,4);
    rows.push({no:i+1,code:'C'+pad(ri(1000,9999)),name,bizno:ri(100,999)+'-'+ri(10,99)+'-'+ri(10000,99999),
      cls:'',mkt:rand(['의원','병원','대리점']),dept:'채권관리팀',seg:rand(['피부','성형','일반']),
      saleDate,year,memo:rand(['소모품 매출','장비 매출','정기 공급','추가 주문']),
      fx:0,amt,collDate:coll>0?daysAgo(ri(1,age)):'',coll,audit:'',bad:0,ar,
      provRate:0,prov,residual:0,payNote:'',elapsed:Math.floor(age/365)+'년',
      trait:type==='회수불가채권'&&Math.random()<0.4?rand(['폐업','도주']):'',
      type,mgr:rand(MGRS),opinion:'',dueNote:'',plan:ar>0&&type!=='정상채권'?rand(['분납 협의','입금 예정','완제 예정','']):'',
      rid:uid('r')});
  }
  return rows;
}
function typeAgg(rows){const a={};TYPES.forEach(t=>a[t]={cnt:0,ar:0});rows.forEach(r=>{if(r.ar>0){(a[r.type]=a[r.type]||{cnt:0,ar:0}).cnt++;a[r.type].ar+=r.ar;}});return a;}
function snap(rows,d){const s={d,cnt:rows.length,amt:0,coll:0,bad:0,ar:0,prov:0,types:{}};TYPES.forEach(t=>s.types[t]={cnt:0,ar:0});
  rows.forEach(r=>{s.amt+=r.amt;s.coll+=r.coll;s.ar+=r.ar;s.prov+=r.prov;if(r.ar>0){s.types[r.type].cnt++;s.types[r.type].ar+=r.ar;}});return s;}

function build(){
  const rows=buildRows(42);
  const asOf='2026-07-17';
  // 주간 스냅샷 3개: 과거 2주는 미수 약간 더 많게(회수 반영 추세)
  const wk=[
    {...snap(rows,'2026-07-03'), ar:Math.round(snap(rows,'2026-07-03').ar*1.08), cnt:rows.length+4},
    {...snap(rows,'2026-07-10'), ar:Math.round(snap(rows,'2026-07-10').ar*1.03), cnt:rows.length+2},
    snap(rows,'2026-07-17'),
  ];
  // 이번주 변동
  const arRows=rows.filter(r=>r.ar>0);
  const changes=[{d:'2026-07-17',prev:'2026-07-10',
    coll:arRows.slice(0,2).map(r=>({n:r.name,v:r.ar,m:r.memo,g:r.mgr,t:r.type})),
    red:arRows.slice(2,4).map(r=>({n:r.name,v:Math.round(r.ar*0.3),m:r.memo,g:r.mgr,t:r.type,d0:Math.round(r.ar*0.7)})),
    new:arRows.slice(4,6).map(r=>({n:r.name,v:r.ar,m:r.memo,g:r.mgr,t:r.type})),
    adj:[],
    sumColl:arRows.slice(0,2).reduce((s,r)=>s+r.ar,0)+arRows.slice(2,4).reduce((s,r)=>s+Math.round(r.ar*0.3),0),
    sumNew:arRows.slice(4,6).reduce((s,r)=>s+r.ar,0), sumAdj:0}];
  // 관리대상
  const mgmtRows=rows.filter(r=>r.ar>0&&(r.type==='장기체납채권'||r.type==='회수불가채권')).slice(0,12);
  const mgmt={asOf,base:asOf,
    summary:{'집중관리':{cnt:0,ar:0},'검토필요':{cnt:0,ar:0},'관리제외':{cnt:0,ar:0}},
    items:mgmtRows.map((r,i)=>{const cls=r.type==='회수불가채권'?'집중관리':(i%3===0?'검토필요':'집중관리');
      return {no:i+1,name:r.name,year:r.year,elapsed:r.elapsed,ar:r.ar,mgr:r.mgr,state:r.type,cls,
        basis:'경과 '+r.elapsed+' · '+(r.trait||'장기 미회수'),opinion:rand(['법적조치 검토','분납 재약정','대손 검토','추가 협의']),rid:r.rid};})};
  mgmt.items.forEach(it=>{mgmt.summary[it.cls].cnt++;mgmt.summary[it.cls].ar+=it.ar;});
  return {asOf,updatedAt:'2026-07-23',rows,weekly:wk,changes,mgmt};
}
module.exports={build,buildRows};
if(require.main!==module) return;
(async()=>{
  const data=build();
  await rest('DELETE','cons_cache?key=eq.ar_kr');
  const r=await rest('POST','cons_cache',{key:'ar_kr',data,updated_at:new Date().toISOString()});
  console.log('ar_kr ->',r.status,r.status>=300?r.body.slice(0,200):'');
  await rest('DELETE','cons_cache?key=eq.ar_kr_edits');
  const e=await rest('POST','cons_cache',{key:'ar_kr_edits',data:{},updated_at:new Date().toISOString()});
  console.log('ar_kr_edits ->',e.status);
  // access 에 'ar' 추가
  const q=await rest('GET','crm_profiles?select=id,access'); let list=[];try{list=JSON.parse(q.body);}catch(_){}
  for(const p of list){const acc=new Set(String(p.access||'').split(',').map(s=>s.trim()).filter(Boolean));acc.add('ar');await rest('PATCH','crm_profiles?id=eq.'+p.id,{access:Array.from(acc).join(',')});}
  console.log('crm_profiles +ar ->',list.length,'명');
})().catch(e=>{console.error(e);process.exit(1);});
