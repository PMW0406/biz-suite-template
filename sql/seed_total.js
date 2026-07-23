// ============================================================
// 전사 종합(total.html) 데모 데이터 시드 (service_role 키)
// 실행: node sql/seed_total.js
//   - 서비스키는 로컬 파일에서만 읽음(출력/커밋 금지)
//   - crm_profiles 데모계정 3명 + cons_cache 7키 + targets/pending_sales 가짜 주입
//   - 실제 회사 데이터 없음. 트랜잭션을 만들어 상향집계 → 뷰 간 수치 일관성 보장.
// 사전조건: sql/real_schema.sql 을 Supabase SQL Editor 에서 먼저 실행(테이블 생성).
// ============================================================
const fs = require('fs');
const https = require('https');

const BASE = 'https://bdkurlqmfsswgeiujyev.supabase.co';
const SECRET_FILE = process.env.WT_SECRET_FILE || 'C:/Users/user/Desktop/메모장.txt';
const KEY = fs.readFileSync(SECRET_FILE, 'utf8').trim();

function api(method, path, body, extraHeaders){
  return new Promise((res,rej)=>{
    const data = body!=null ? JSON.stringify(body) : null;
    const u = new URL(BASE+path);
    const req = https.request(u,{method,headers:{
      apikey:KEY, Authorization:'Bearer '+KEY, 'Content-Type':'application/json',
      Prefer:'return=representation', ...(extraHeaders||{}),
      ...(data?{'Content-Length':Buffer.byteLength(data)}:{})
    }},r=>{ let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode,body:d})); });
    req.on('error',rej); if(data) req.write(data); req.end();
  });
}
const rest = (m,t,b,h)=>api(m,'/rest/v1/'+t,b,h);
async function putCache(key,data){                    // cons_cache upsert (PK=key)
  await rest('DELETE','cons_cache?key=eq.'+encodeURIComponent(key));
  const r = await rest('POST','cons_cache',{key,data,updated_at:new Date().toISOString()});
  console.log('  cons_cache['+key+'] ->', r.status);
  if(r.status>=300) console.log('    !', r.body.slice(0,200));
}

// ── 랜덤 유틸 ────────────────────────────────────────────
const rand = a => a[Math.floor(Math.random()*a.length)];
const ri = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const pad = n => String(n).padStart(2,'0');
const man = v => Math.round(v/10000)*10000;           // 만원 단위 반올림
const add = (o,k,v)=>{ o[k]=(o[k]||0)+v; };

// ── 가상 마스터 데이터 (실존 회사/제품/사람 아님) ──────────
const REGIONS = ['동남아','중화','중동','유럽','미주'];      // 해외 지역
const CORPS   = ['태국법인','미국법인','일본법인'];           // 해외 법인
const DEV_PRODUCTS  = ['면역형광 분석기 IF-100','바이오PCR 분석기 P-200','생화학 분석기 C-300'];   // 장비(대당 수천만원)
const CONS_PRODUCTS = ['파보·디스템퍼 항원키트','심장사상충 진단키트','인체 면역진단 스트립'];        // 국내 소모품
const DOM_DEV_REPS  = ['강민재','윤채원','임태양','한소율'];
const DOM_CONS_REPS = ['김서연','이준호','박도윤','최지우','정하은'];
const INTL_REPS     = ['오세훈','신유나','권지호'];
const HOSP_PRE = ['서울','강남','부산','대구','인천','수원','성남','대전','광주','울산','청담','분당','일산','목동','송도','평촌'];
const HOSP_SUF = ['동물메디컬','종합동물병원','수의검사센터','진단검사센터','펫클리닉','바이오랩','동물의료원','진단랩'];
const MO26 = [1,2,3,4,5,6,7];                          // 2026 데이터 존재 월(기준일 7/15)
const MO25 = [1,2,3,4,5,6,7,8,9,10,11,12];
const UPDATED = '2026-07-15';
const RATE = 1350;                                     // KRW/USD

function repInit(){ return {m2026:{},m2025:{},y2026:0,y2025:0,cust2026:0,cust2025:0,qty2026:0,prods2026:{},total:0,prods:{},m:{}}; }

// ── 국내(소모품=CONS / 제품=DEVICE) 생성 ─────────────────
function buildDomestic(isDevice){
  const products = isDevice?DEV_PRODUCTS:CONS_PRODUCTS;
  const reps = isDevice?DOM_DEV_REPS:DOM_CONS_REPS;
  const nHosp = isDevice?34:52;
  const B = {
    monthly2026:{}, monthly2025:{}, products2026:{}, products2025:{},
    reps:{}, data2025:{reps:{}}, hospitals:{}, updatedAt:UPDATED
  };
  if(isDevice){ Object.assign(B,{monthlyQty2026:{},monthlyQty2025:{},prodQty2026:{},prodQty2025:{}}); }
  reps.forEach(r=>{ B.reps[r]=repInit(); B.data2025.reps[r]={m:{},total:0,prods:{}}; });
  const custSeen = {2026:{}, 2025:{}};                 // rep -> set(hospital)

  for(let hi=0; hi<nHosp; hi++){
    const name = rand(HOSP_PRE)+rand(HOSP_SUF)+(hi+1);
    const rep = reps[hi % reps.length];
    const ho = B.hospitals[name] = {txns2026:[], y2026:0, y2025:0};
    [[2026,MO26],[2025,MO25]].forEach(([yr,mos])=>{
      mos.forEach(mo=>{
        if(Math.random()<(isDevice?0.5:0.85)){         // 매월 거래 확률
          const prod = rand(products);
          const qty  = isDevice?ri(1,6):ri(40,190);
          const unit = isDevice?ri(38,85)*1000000:ri(28,60)*10000;
          const amt  = man(qty*unit);
          const dateStr = yr+'-'+String(mo).padStart(2,'0')+'-'+String(ri(3,26)).padStart(2,'0');
          if(yr===2026){
            ho.txns2026.push(isDevice
              ? ['tx'+hi+mo, dateStr, '장비', prod, amt, qty]     // DEVICE: t[1]date t[3]prod t[4]amt t[5]qty
              : ['tx'+hi+mo, dateStr, prod, amt, qty]);            // CONS:   t[1]date t[2]prod t[3]amt t[4]qty
          }
          // 집계
          const mkey=String(mo);
          add(B['monthly'+yr], mkey, amt);
          add(B['products'+yr], prod, amt);
          ho['y'+yr]+=amt;
          const R=B.reps[rep];
          add(R['m'+yr], mkey, amt); R['y'+yr]+=amt;
          if(yr===2026){ add(R.prods2026, prod, amt); add(R.prods, prod, amt); R.qty2026+=qty; }
          (custSeen[yr][rep]=custSeen[yr][rep]||new Set()).add(name);
          if(isDevice){
            add(B['monthlyQty'+yr], mkey, qty);
            add(B['prodQty'+yr], prod, qty);
          }
          // 2025 rep 미러(_repAcc 폴백용)
          if(yr===2025){ const D=B.data2025.reps[rep]; add(D.m, mkey, amt); D.total+=amt; add(D.prods, prod, amt); }
        }
      });
    });
  }
  // rep 파생필드 마감
  reps.forEach(r=>{
    const R=B.reps[r];
    R.total=R.y2026; R.m=R.m2026;
    R.cust2026=(custSeen[2026][r]||new Set()).size;
    R.cust2025=(custSeen[2025][r]||new Set()).size;
  });
  return B;
}

// 해외 국가 → 버킷(법인 or 지역). 법인 3종은 corps 뷰, 지역은 지역별/리포트 뷰가 읽음.
const OVERSEAS = [
  {cc:'TH', name:'태국',       bucket:'태국법인'},
  {cc:'US', name:'미국',       bucket:'미국법인'},
  {cc:'JP', name:'일본',       bucket:'일본법인'},
  {cc:'VN', name:'베트남',     bucket:'동남아'},
  {cc:'CN', name:'중국',       bucket:'중화'},
  {cc:'AE', name:'아랍에미리트', bucket:'중동'},
  {cc:'DE', name:'독일',       bucket:'유럽'},
  {cc:'BR', name:'브라질',     bucket:'미주'},
];
const _rnorm = s => String(s||'').replace(/[\s,.\-_()\/]/g,'').toLowerCase();

// ── 해외(INTL) 생성 ──────────────────────────────────────
function buildIntlYear(mos){
  const yr = mos.length>7?2025:2026;
  const Y = {
    monthly:{}, monthly_usd:{}, products:{}, prods_cons:{}, prods_dev:{},
    prodMo:{}, prodMoQty:{}, countries:{}, reps:{}
  };
  const isDev = p => DEV_PRODUCTS.includes(p);
  INTL_REPS.forEach(r=>{ Y.reps[r]={m:{},total:0,clients:0,countries:0,prods:{}}; });
  OVERSEAS.forEach((ov,idx)=>{
    const cc=ov.cc, cnBase=ov.name;
    const rep = INTL_REPS[idx % INTL_REPS.length];
    const prods = [rand(DEV_PRODUCTS), rand(DEV_PRODUCTS), rand(CONS_PRODUCTS)];
    const nClient = ri(4,8);
    const C = Y.countries[cc] = {clients:nClient, prods:{}, clientData:{}};
    Y.reps[rep].countries += 1;
    for(let c=0;c<nClient;c++){
      const client = cnBase+(ov.bucket.endsWith('법인')?' 법인': ' 딜러')+(c+1);
      const cd = C.clientData[client] = {m:{}, total:0, cnt:0, last:'', txns:[], prods:{}};
      Y.reps[rep].clients += 1;
      let usdCum=0;
      mos.forEach(mo=>{
        if(Math.random()<0.65){
          const prod = rand(prods);
          const qty  = isDev(prod)?ri(1,6):ri(15,60);
          const unit = isDev(prod)?ri(35,80)*1000000:ri(14,32)*10000;  // 장비 단가≥100만원
          const amt  = man(qty*unit);
          const usd  = Math.round(amt/RATE);
          const mkey = String(mo);
          const dstr = yr+'-'+pad(mo)+'-'+pad(ri(3,26));
          usdCum += usd;
          add(cd.m, mkey, amt); cd.total+=amt; cd.cnt++; cd.last=dstr;
          cd.txns.push([dstr, prod, qty, amt, usdCum]); add(cd.prods, prod, amt);
          add(Y.monthly, mkey, amt);
          add(Y.monthly_usd, mkey, usd);
          add(Y.products, prod, amt);
          add(isDev(prod)?Y.prods_dev:Y.prods_cons, prod, amt);
          (Y.prodMo[prod]=Y.prodMo[prod]||{}); add(Y.prodMo[prod], mkey, amt);
          (Y.prodMoQty[prod]=Y.prodMoQty[prod]||{}); add(Y.prodMoQty[prod], mkey, qty);
          add(C.prods, prod, amt);
          const R=Y.reps[rep]; add(R.m, mkey, amt); R.total+=amt; add(R.prods, prod, amt);
        }
      });
    }
  });
  return Y;
}

// ── region_map : 거래처(국가)→버킷(법인/지역) 매핑 ──────
function buildRegionMap(){
  const country={}; OVERSEAS.forEach(o=>{ country[o.cc]=o.bucket; });
  return { pair:{}, name:{}, country };
}

// 해외 지역/법인별 월 실적(intl.countries.clientData.m 을 버킷 집계)
function _intlRegionMonthly(I){
  const rm={};
  Object.entries((I&&I.countries)||{}).forEach(([cc,C])=>{
    const bucket=(OVERSEAS.find(o=>o.cc===cc)||{}).bucket||'기타';
    Object.values(C.clientData||{}).forEach(cd=>{
      Object.entries(cd.m||{}).forEach(([mo,amt])=>{ (rm[bucket]=rm[bucket]||{}); rm[bucket][mo]=(rm[bucket][mo]||0)+amt; });
    });
  });
  return rm;
}
// ── sales_targets : 항목별 달성률 다양(40~130%), 전체 가중평균 ~110% ──
function buildSalesTargets(cons, dev, intl26, intl25){
  const rows=[];
  const buckets=[...new Set(OVERSEAS.map(o=>o.bucket))];
  const reg={2026:_intlRegionMonthly(intl26), 2025:_intlRegionMonthly(intl25||intl26)};
  const OVERALL=1.10;  // 전체 달성률 목표

  [[2026,MO26],[2025,MO25]].forEach(([yr,mos])=>{
    // (dept,item) 슬라이스 + 월별 실적
    const items=[['국내영업','제품',dev['monthly'+yr]||{}],['국내영업','소모품',cons['monthly'+yr]||{}]];
    buckets.forEach(b=>items.push(['해외영업',b,(reg[yr]||{})[b]||{}]));
    // 항목별 기준 달성률(다양하게: 대부분 0.55~1.35, 일부 극단 0.4/1.4)
    const pool=[0.42,0.55,0.68,0.8,0.9,1.0,1.05,1.15,1.28,1.4];
    const slices=[];
    items.forEach(([dept,item,mon])=>{
      const ach = pool[Math.floor(Math.random()*pool.length)]*(0.92+Math.random()*0.16); // 항목 고유 달성률
      mos.forEach(mo=>{ const a=Number((mon||{})[String(mo)]||(mon||{})[mo]||0); if(a>0) slices.push({dept,item,mo,a,ach}); });
    });
    // 전체 가중평균이 OVERALL 되도록 스케일 k
    const sumA=slices.reduce((s,x)=>s+x.a,0);
    const sumRaw=slices.reduce((s,x)=>s+x.a/x.ach,0)||1;
    const k=(sumA/OVERALL)/sumRaw;
    slices.forEach(x=> rows.push({year:yr,month:x.mo,dept:x.dept,item:x.item, amount:man(Math.max(1000000, x.a/x.ach*k)) }));
  });
  return {rows};
}

// ── targets(테이블) : 월 목표 ────────────────────────────
function buildTargets(cons,dev,intl){
  const rows=[];
  MO26.forEach(mo=>{
    const mkey=String(mo);
    const tot=((cons.monthly2026||{})[mkey]||0)+((dev.monthly2026||{})[mkey]||0)+((intl.monthly||{})[mkey]||0);
    rows.push({id:'tgt-2026-'+String(mo).padStart(2,'0'), data:{ym:'2026-'+String(mo).padStart(2,'0'), target:man(tot*(0.95+Math.random()*0.15))}});
  });
  return rows;
}


// ── export_tower ─────────────────────────────────────────
function cycMonths(start, n, lo, hi){
  const [sy,sm]=start.split('-').map(Number); const o={};
  for(let i=0;i<n;i++){ const d=new Date(sy,sm-1+i,1); const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); o[k]=ri(lo,hi); }
  return o;
}
function buildExport(){
  return {
    rate:RATE,
    cycles:[
      // id 는 EXPORT_DEFAULT(c2025/c2026_70/c2026_100)와 맞춰 months 만 override. c2024 는 그 이전 차수로 추가.
      {id:'c2024', target:30000000, label:'3천만불', title:'2024년 수출의 탑', start:'2023-07', months:cycMonths('2023-07',12,1500000,3200000)},
      {id:'c2025', months:cycMonths('2024-07',12,2600000,4800000)},
      {id:'c2026_70', months:cycMonths('2025-07',12,3000000,6200000)},
      // c2026_100(2027년 1억불, 진행 중)은 months 미지정 → 코드가 INTL.monthly_usd 로 자동 채움
    ],
    kita:[ {year:'2022',amount:28500000},{year:'2023',amount:41200000},{year:'2024',amount:57800000} ],
    yearly:{ labels:['2022년','2023년','2024년','2025년'], acc:[2850,4120,5780,6900], exp:[2600,3800,5200,6400], insight:'수출 규모가 3년 연속 성장하며 5천만불 탑을 조기 달성, 7천만불 도전 구간에 진입.' },
    updatedAt:new Date().toISOString()
  };
}

// ── ilbo_pending / pending_sales ─────────────────────────
function buildIlboPending(){
  const rows=[];
  for(let i=0;i<5;i++) rows.push({region:'해외', status:'대기', expectedDate:'2026-08-'+String(ri(5,25)).padStart(2,'0'), amount:man(ri(15,90)*1000000)});
  return {rows};
}
function buildPendingSales(){
  const rows=[];
  for(let i=0;i<6;i++){ // 국내 예정분
    const isDev=Math.random()<0.5;
    rows.push({ hospital:rand(HOSP_PRE)+rand(HOSP_SUF), product:rand(isDev?DEV_PRODUCTS:CONS_PRODUCTS),
      category:isDev?'제품':'소모품', amount:man(ri(10,60)*1000000), qty:ri(1,10),
      expected_date:'2026-08-'+String(ri(3,26)).padStart(2,'0'), status:'대기', channel:'korea', region:null });
  }
  for(let i=0;i<3;i++){ // 해외 예정분
    rows.push({ hospital:rand(REGIONS)+' 딜러', product:rand(DEV_PRODUCTS),
      category:'제품', amount:man(ri(20,80)*1000000), qty:ri(1,5),
      expected_date:'2026-08-'+String(ri(3,26)).padStart(2,'0'), status:'대기', channel:'intl', region:rand(REGIONS) });
  }
  return rows;
}

// ── 데모 사용자 ──────────────────────────────────────────
const USERS = [
  { email:'admin@demo.local',   password:'demo1234', name:'김관리', dept:'경영지원팀', position:'이사',   role:'admin',   access:'all' },
  { email:'manager@demo.local', password:'demo1234', name:'이팀장', dept:'글로벌영업실', position:'팀장', role:'manager', access:'korea,intl,dashboard' },
  { email:'user@demo.local',    password:'demo1234', name:'박사원', dept:'글로벌영업실', position:'사원', role:'user',    access:'korea,intl' },
];
async function seedUsers(){
  console.log('== 1) 데모 사용자 ==');
  for(const u of USERS){
    const r = await api('POST','/auth/v1/admin/users',{ email:u.email, password:u.password, email_confirm:true });
    let uid=null; try{ uid=JSON.parse(r.body).id; }catch(e){}
    if(!uid){ const q=await api('GET','/auth/v1/admin/users?per_page=200'); try{ uid=(JSON.parse(q.body).users||[]).find(x=>x.email===u.email)?.id; }catch(e){} }
    if(!uid){ console.log('  ! '+u.email+' 생성실패', r.body.slice(0,120)); continue; }
    await rest('DELETE','crm_profiles?id=eq.'+uid);
    const p = await rest('POST','crm_profiles',{ id:uid, email:u.email, display_name:u.name, dept:u.dept, position:u.position, role:u.role, access:u.access });
    console.log('  '+u.email+' ('+u.role+') profile->', p.status);
  }
}

module.exports = { buildDomestic, buildIntlYear, buildSalesTargets, buildTargets, buildRegionMap, buildExport, buildIlboPending, buildPendingSales, MO26, MO25 };

if(require.main!==module) return;

(async()=>{
  const CONS = buildDomestic(false);
  const DEVICE = buildDomestic(true);
  const INTL2026 = buildIntlYear(MO26);
  const INTL2025 = buildIntlYear(MO25);
  const INTL_BLOB = { INTL2026, INTL2025, updatedAt:UPDATED };

  await seedUsers();

  console.log('== 2) cons_cache 7키 ==');
  await putCache('main', CONS);
  await putCache('device', DEVICE);
  await putCache('intl', INTL_BLOB);
  await putCache('sales_targets', buildSalesTargets(CONS,DEVICE,INTL2026,INTL2025));
  await putCache('region_map', buildRegionMap());
  await putCache('export_tower', buildExport());
  await putCache('ilbo_pending', buildIlboPending());

  console.log('== 3) targets / pending_sales ==');
  await rest('DELETE','targets?id=like.tgt-*');
  const t = await rest('POST','targets', buildTargets(CONS,DEVICE,INTL2026));
  console.log('  targets ->', t.status);
  await rest('DELETE','pending_sales?status=eq.대기');
  const ps = await rest('POST','pending_sales', buildPendingSales());
  console.log('  pending_sales ->', ps.status, ps.status>=300?ps.body.slice(0,200):'');

  console.log('\n완료. 데모 로그인: admin@demo.local / manager@demo.local / user@demo.local  (비번 demo1234)');
})().catch(e=>{ console.error('시드 오류', e); process.exit(1); });
