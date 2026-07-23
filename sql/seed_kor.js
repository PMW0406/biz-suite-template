// ============================================================
// wontech kor(index.html) 데모 시드 (v2 — 빈 화면 방지 전면 보강)
//   cons_cache: hospital_regions, kor_team, hospital_info, mgr_claims
//   테이블(제네릭 {id,data}): customers/pipeline/quotes/logs
//   테이블(flat): pending_sales(korea)
//   ※ 병원명은 kor.html 임베디드 CONS/DEVICE에서 추출해 연동
// 실행: node sql/seed_kor.js
// ============================================================
const fs=require('fs'), https=require('https');
const BASE='https://bdkurlqmfsswgeiujyev.supabase.co';
const KEY=fs.readFileSync(process.env.WT_SECRET_FILE||'C:/Users/user/Desktop/메모장.txt','utf8').trim();
function api(m,p,b,e){return new Promise((res,rej)=>{const data=b!=null?JSON.stringify(b):null;const u=new URL(BASE+p);const rq=https.request(u,{method:m,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation',...(e||{}),...(data?{'Content-Length':Buffer.byteLength(data)}:{})}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:d}));});rq.on('error',rej);if(data)rq.write(data);rq.end();});}
const rest=(m,t,b,h)=>api(m,'/rest/v1/'+t,b,h);
const rand=a=>a[Math.floor(Math.random()*a.length)], ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pad=n=>String(n).padStart(2,'0');

// ── 임베디드 병원/제품명 추출 (kor.html) ──────────────────
function extractHosps(){
  const raw=fs.readFileSync('kor.html','utf8');
  const nl=raw.indexOf('\r\n')>=0?'\r\n':'\n';
  const lines=raw.split(nl);
  function ext(name){ const pre='const '+name+' = '; const l=lines.find(x=>x.startsWith(pre+'{')); return l?JSON.parse(l.slice(pre.length).replace(/;\s*$/,'')):{}; }
  const DEV=ext('DEVICE'), CONS=ext('CONS');
  const devH=Object.keys(DEV.hospitals||{}), consH=Object.keys(CONS.hospitals||{});
  const prods=Object.keys(DEV.products2026||{}).concat(Object.keys(CONS.products2026||{}));
  return {devH, consH, prods};
}

// 9명(파트/직급은 KOR_TEAM_INFO와 일치)
const TEAM=[
  {name:'이준호',dept:'한국영업1파트',pos:'부장'},{name:'김서연',dept:'한국영업1파트',pos:'차장'},
  {name:'박도윤',dept:'한국영업1파트',pos:'차장'},{name:'최지우',dept:'한국영업1파트',pos:'과장'},
  {name:'정하은',dept:'한국영업1파트',pos:'과장'},{name:'강민재',dept:'한국영업1파트',pos:'대리'},
  {name:'윤채원',dept:'한국영업2파트',pos:'차장'},{name:'한소율',dept:'한국영업2파트',pos:'과장'},
  {name:'임태양',dept:'한국영업2파트',pos:'과장'},
];
const REPS=TEAM.map(t=>t.name);
const REGION_OF=n=>{const m={서울:['서울특별시','강남구'],강남:['서울특별시','강남구'],청담:['서울특별시','강남구'],목동:['서울특별시','양천구'],
  부산:['부산광역시','해운대구'],대구:['대구광역시','수성구'],인천:['인천광역시','남동구'],송도:['인천광역시','연수구'],
  수원:['경기도','수원시'],성남:['경기도','성남시'],분당:['경기도','성남시'],일산:['경기도','고양시'],
  대전:['대전광역시','유성구'],광주:['광주광역시','서구'],울산:['울산광역시','남구'],제주:['제주특별자치도','제주시'],
  창원:['경상남도','창원시'],천안:['충청남도','천안시'],전주:['전라북도','전주시'],포항:['경상북도','포항시'],김해:['경상남도','김해시'],안양:['경기도','안양시'],고양:['경기도','고양시']};
  for(const k in m) if(n.startsWith(k)) return m[k]; return ['서울특별시','강남구'];};

function buildKorTeam(){return {members:TEAM.map((t,i)=>({name:t.name,dept:t.dept,pos:t.pos,bday:pad(ri(1,12))+'-'+pad(ri(1,28)),phone:'010-1'+pad(i)+'0-'+pad(ri(10,99))+pad(ri(10,99))})),updatedBy:'관리자',updatedAt:'2026-07-01'};}

function buildHospInfo(hosps){
  const info={};
  hosps.slice(0,80).forEach((nm,i)=>{
    const reg=REGION_OF(nm);
    info[nm]={doctor:rand(['김','이','박','최','정'])+'원장',tel:'0'+ri(2,64)+'-'+ri(200,999)+'-'+ri(1000,9999),
      address:reg[0]+' '+reg[1]+' '+ri(1,300),contact:'실장 '+rand(['김','이','박'])+rand(['지은','서연','민수']),
      note:rand(['VIP 거래처','재구매 우수','신규 도입 검토','경쟁사 비교중','']),mgr:REPS[i%REPS.length],
      contacts:[{role:'원장',name:rand(['김','이','박'])+'원장',tel:'010-2'+pad(i%100)+'-'+ri(1000,9999),note:''},
                {role:'실장',name:rand(['김','이','박'])+'실장',tel:'010-3'+pad(i%100)+'-'+ri(1000,9999),note:'구매결정'}],
      tags:rand([['VIP'],['리레이저'],['신규'],[]]),region:reg,updatedBy:'관리자',updatedAt:'2026-0'+ri(3,7)+'-'+pad(ri(1,28))};
  });
  return info;
}
function buildClaims(devH){
  const claims=[];
  for(let i=0;i<4;i++) claims.push({hosp:rand(devH),by:rand(REPS.slice(6)),at:'2026-07-'+pad(ri(1,20)),status:'pending'});
  for(let i=0;i<3;i++) claims.push({hosp:rand(devH),by:rand(REPS),at:'2026-06-'+pad(ri(1,25)),status:rand(['approved','rejected']),decidedBy:'윤채원',decidedAt:'2026-06-'+pad(ri(20,28))});
  return {claims};
}
function buildRegions(){
  const kw={서울:['서울특별시','강남구'],강남:['서울특별시','강남구'],청담:['서울특별시','강남구'],목동:['서울특별시','양천구'],
    부산:['부산광역시','해운대구'],대구:['대구광역시','수성구'],인천:['인천광역시','남동구'],송도:['인천광역시','연수구'],
    수원:['경기도','수원시'],성남:['경기도','성남시'],분당:['경기도','성남시'],일산:['경기도','고양시'],
    대전:['대전광역시','유성구'],광주:['광주광역시','서구'],울산:['울산광역시','남구']};
  return {regions:{},kw};
}

function buildPipeline(hosps,prods){
  const stages=['상담중','견적발송','협의중','계약완료'];
  return Array.from({length:44},(_,i)=>{const stage=stages[i%4];const won=stage==='계약완료';
    return {id:'pipe'+i,custName:rand(hosps),model:rand(prods),amount:ri(80,320)*1000000,stage,prob:won?100:ri(20,80),
      expectedDate:'2026-'+pad(ri(8,11))+'-'+pad(ri(1,28)),sales:rand(REPS),note:'',nextAction:rand(['데모 방문','견적 재발송','계약 협의','설치 일정']),
      nextDate:'2026-07-'+pad(ri(24,31)),nextType:'방문',createdAt:'2026-0'+ri(3,6)+'-01T00:00:00Z',
      stageUpdatedAt:'2026-0'+ri(5,7)+'-'+pad(ri(1,28))+'T00:00:00Z',history:[],done:won&&Math.random()<0.5};});
}
function buildLogs(hosps,prods){
  const out=[];
  // 일반 상담일지 + 후속
  for(let i=0;i<30;i++) out.push({id:'log'+i,date:'2026-07-'+pad(ri(1,22)),custName:rand(hosps),type:rand(['방문','전화','이메일','데모']),
    content:'상담 진행 · '+rand(['가격 문의','데모 요청','재구매 논의','신규 관심']),product:rand(prods),
    nextAction:Math.random()<0.5?rand(['재방문','견적 발송','샘플 전달']):'',nextDate:Math.random()<0.5?'2026-07-'+pad(ri(24,31)):'',sales:rand(REPS),by:rand(REPS)});
  // CDU 방문(kind:cdu)
  for(let i=0;i<26;i++) out.push({id:'cdu'+i,kind:'cdu',status:rand(['done','done','planned']),date:'2026-07-'+pad(ri(1,22)),custName:rand(hosps),
    dealer:'',doctor:rand(['김','이','박'])+'원장',doctorCount:String(ri(1,4)),mainProc:rand(['전염병 스크리닝','호흡기 진단','소화기 진단','혈액 검사','건강검진']),
    competitor:rand(['경쟁사 A','수입 키트','경쟁사 B','']),feedback:rand(['가격 문의','정확도 검토','도입 검토','재구매','물량 협의']),channels:'인스타/네이버',
    region:'국내',sales:rand(REPS),event:rand(['O','']),reels:rand(['O','']),price:String(ri(100,500)),procCount:String(ri(1,20)),
    stock:'',churnRisk:'',noBuyReason:'',action:rand(['재방문','견적','계약추진']),contactProfile:'',oliBasic:'',oliX:'',oliKiss:'',by:rand(REPS)});
  // CDU 종합의견(주차)
  for(let w=1;w<=3;w++) out.push({id:'cdu_note_2026-7-'+w,kind:'cdu_note',week:'2026-7-'+w,text:w+'주차 방문 요약: 신규 리드 '+ri(2,6)+'건, 데모 '+ri(1,4)+'건 진행.',by:rand(REPS),updatedAt:'2026-07-'+pad(w*7)});
  // CDU Keyman
  for(let i=0;i<5;i++) out.push({id:'cdukey'+i,kind:'cdu_key',custName:rand(hosps),contactName:rand(['김','이','박'])+rand(['실장','원장','팀장']),title:rand(['구매결정','실무']),phone:'010-4'+pad(i)+'0-'+ri(1000,9999),note:''});
  // CDU 월간계획
  out.push({id:'cduplan',kind:'cdu_plan',month:'2026-08',targetVisits:24,targets:hosps.slice(0,8).join('\n')});
  return out;
}
function buildCustomers(hosps){return hosps.slice(0,55).map((nm,i)=>{const reg=REGION_OF(nm);return {id:'cust'+i,name:nm,doctor:rand(['김','이','박'])+'원장',region:reg[0],address:reg[0]+' '+reg[1],tel:'0'+ri(2,64)+'-'+ri(200,999)+'-'+ri(1000,9999),contact:'실장',contactTel:'010-5'+pad(i%100)+'-'+ri(1000,9999),sales:REPS[i%REPS.length],grade:rand(['VIP','잠재','일반']),note:'',tags:rand([['VIP'],[],['신규']])};});}
function buildQuotes(hosps,prods){return Array.from({length:14},(_,i)=>{const items=Array.from({length:ri(1,3)},()=>{const price=ri(1500,6000)*10000,qty=ri(1,3);return {name:rand(prods),spec:'',unit:'EA',qty,price,amount:Math.round(price*qty*1.1),note:''};});
  const total=items.reduce((s,x)=>s+x.amount,0),subtotal=Math.round(total/1.1),vat=total-subtotal;const t=TEAM[i%TEAM.length];
  return {id:'Q202607'+pad(i+10)+'-'+pad(i+1),custName:rand(hosps),quoteDate:'2026-07-'+pad(ri(1,20)),validUntil:'2026-08-'+pad(ri(1,28)),
    sales:t.name,salesRank:t.pos,salesTeam:t.dept,salesPhone:'010-1'+pad(i%100)+'-'+ri(1000,9999),status:rand(['임시','발송','수주']),note:'',termsList:[],
    items,subtotal,vat,total,by:t.name,roi:Math.random()<0.4?{payback:ri(6,18)+'개월',rev:ri(2,8)+'억'}:null};});}
function buildPending(hosps,prods){return Array.from({length:28},(_,i)=>{const t=TEAM[i%TEAM.length];return {
  category:rand(['소모품','제품']),expected_date:'2026-0'+ri(8,9)+'-'+pad(ri(1,28)),amount:ri(10,60)*1000000,qty:ri(1,10),
  product:rand(prods),hospital:rand(hosps),memo:'예정',channel:'korea',status:'대기',owner_name:t.name,updated_at:'2026-07-01T00:00:00Z'};});}

module.exports={buildKorTeam,buildHospInfo,buildClaims,buildPipeline,buildLogs,buildCustomers,buildQuotes,buildPending};
if(require.main!==module) return;
async function putCC(key,data){await rest('DELETE','cons_cache?key=eq.'+encodeURIComponent(key));const r=await rest('POST','cons_cache',{key,data,updated_at:new Date().toISOString()});console.log('  cons_cache['+key+'] ->',r.status,r.status>=300?r.body.slice(0,150):'');}
// 제네릭 CRM 테이블: {id, data:record} 로 래핑
async function putGeneric(table,records){await rest('DELETE',table+'?id=not.is.null');const rows=records.map(r=>({id:r.id,data:r}));const r=await rest('POST',table,rows);console.log('  '+table+' ->',r.status,r.status>=300?r.body.slice(0,150):'('+rows.length+')');}
(async()=>{
  const {devH,consH,prods}=extractHosps();
  const allH=[...new Set(devH.concat(consH))];
  console.log('== kor 시드 v2 == (임베디드 병원 '+allH.length+'개, 제품 '+prods.length+'개)');
  await putCC('hospital_regions',buildRegions());
  await putCC('kor_team',buildKorTeam());
  await putCC('hospital_info',buildHospInfo(allH));
  await putCC('mgr_claims',buildClaims(devH));
  await putGeneric('customers',buildCustomers(allH));
  await putGeneric('pipeline',buildPipeline(allH,prods));
  await putGeneric('quotes',buildQuotes(allH,prods));
  await putGeneric('logs',buildLogs(allH,prods));
  // pending_sales (flat 컬럼, korea) — 존재 컬럼만
  await rest('DELETE','pending_sales?channel=eq.korea');
  const psRows=buildPending(allH,prods).map(p=>({hospital:p.hospital,product:p.product,category:p.category,amount:p.amount,qty:p.qty,expected_date:p.expected_date,status:p.status,channel:'korea',region:null}));
  const ps=await rest('POST','pending_sales',psRows);
  console.log('  pending_sales(korea) ->',ps.status,ps.status>=300?ps.body.slice(0,150):'(12)');
  const q=await rest('GET','crm_profiles?select=id,access'); let list=[];try{list=JSON.parse(q.body);}catch(_){}
  for(const p of list){const acc=new Set(String(p.access||'').split(',').map(s=>s.trim()).filter(Boolean));acc.add('korea');await rest('PATCH','crm_profiles?id=eq.'+p.id,{access:Array.from(acc).join(',')});}
  console.log('  crm_profiles +korea ->',list.length);
})().catch(e=>{console.error(e);process.exit(1);});
