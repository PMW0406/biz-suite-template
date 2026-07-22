// ============================================================
// 가짜 데이터 시드 스크립트 (service_role 키 사용)
// 실행: node sql/seed.js
//   - 서비스키는 로컬 파일에서 읽음(채팅/저장소에 노출 안 함)
//   - 데모 사용자 3명 생성 + 거래처/매출 가짜 데이터 주입
// ============================================================
const fs = require('fs');
const https = require('https');

const BASE = 'https://bdkurlqmfsswgeiujyev.supabase.co';
const SECRET_FILE = process.env.WT_SECRET_FILE || 'C:/Users/user/Documents/wt_template_secret.txt';
const KEY = fs.readFileSync(SECRET_FILE, 'utf8').trim();

function api(method, path, body){
  return new Promise((res,rej)=>{
    const data = body?JSON.stringify(body):null;
    const u = new URL(BASE+path);
    const req = https.request(u,{method,headers:{
      apikey:KEY, Authorization:'Bearer '+KEY, 'Content-Type':'application/json',
      Prefer:'return=representation', ...(data?{'Content-Length':Buffer.byteLength(data)}:{})
    }},r=>{ let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode,body:d})); });
    req.on('error',rej); if(data) req.write(data); req.end();
  });
}

// 데모 사용자 (Auth Admin API)
const USERS = [
  { email:'admin@demo.local',   password:'demo1234', name:'김관리', dept:'경영지원', position:'이사',  role:'admin',   access:'crm,dashboard,upload' },
  { email:'manager@demo.local', password:'demo1234', name:'이팀장', dept:'영업1팀',  position:'팀장',  role:'manager', access:'crm,dashboard' },
  { email:'user@demo.local',    password:'demo1234', name:'박사원', dept:'영업1팀',  position:'사원',  role:'user',    access:'crm' },
];

const NAMES = ['가온','나래','다솜','라온','미르','바다','새롬','아름','예찬','우주','자람','차미','타래','하늘','한결'];
const CORP = ['테크','시스템','메디','바이오','솔루션','네트웍스','인더스트리','파트너스','글로벌','랩'];
const REGIONS = ['서울','경기','부산','대구','인천','광주','대전','울산'];
const STAGES = ['리드','상담중','견적','계약','보류'];
const PRODUCTS = ['제품 A','제품 B','제품 C','서비스 X','서비스 Y'];
const rand = a => a[Math.floor(Math.random()*a.length)];
const ri = (a,b) => Math.floor(Math.random()*(b-a+1))+a;

(async()=>{
  console.log('== 1) 데모 사용자 생성 ==');
  for(const u of USERS){
    const r = await api('POST','/auth/v1/admin/users',{ email:u.email, password:u.password, email_confirm:true });
    let uid=null; try{ uid=JSON.parse(r.body).id; }catch(e){}
    if(!uid){ // 이미 존재하면 조회
      const q = await api('GET','/auth/v1/admin/users?per_page=200');
      try{ uid=(JSON.parse(q.body).users||[]).find(x=>x.email===u.email)?.id; }catch(e){}
    }
    if(!uid){ console.log('  ! '+u.email+' 생성 실패:', r.body.slice(0,120)); continue; }
    await api('POST','/rest/v1/app_profiles',{ id:uid, email:u.email, display_name:u.name, dept:u.dept, position:u.position, role:u.role, access:u.access });
    // upsert 위해 conflict 시 PATCH
    await api('PATCH','/rest/v1/app_profiles?id=eq.'+uid,{ display_name:u.name, dept:u.dept, position:u.position, role:u.role, access:u.access });
    console.log('  OK '+u.email+' ('+u.role+')');
  }

  console.log('== 2) 거래처 40건 ==');
  const custs = Array.from({length:40},()=>({
    name: rand(NAMES)+rand(CORP), owner: rand(['이팀장','박사원','김관리']),
    region: rand(REGIONS), stage: rand(STAGES),
    amount: ri(3,80)*1000000, memo: rand(['재방문 예정','견적 검토중','경쟁사 비교','예산 확인','계약 임박',''])
  }));
  const c = await api('POST','/rest/v1/demo_customers', custs);
  console.log('  status', c.status, '건수', (()=>{try{return JSON.parse(c.body).length}catch(e){return '?'}})());

  console.log('== 3) 매출 12개월 x 지역 ==');
  const sales=[]; const now=new Date('2026-07-01');
  for(let m=0;m<12;m++){ const d=new Date(now); d.setMonth(d.getMonth()-m); const ym=d.toISOString().slice(0,7);
    for(const rg of REGIONS){ sales.push({ ym, region:rg, product:rand(PRODUCTS), amount: ri(10,200)*1000000 }); } }
  const s = await api('POST','/rest/v1/demo_sales', sales);
  console.log('  status', s.status, '건수', (()=>{try{return JSON.parse(s.body).length}catch(e){return '?'}})());

  console.log('\n완료. 데모 로그인: admin@demo.local / manager@demo.local / user@demo.local  (비번 demo1234)');
})();
