// ============================================================
// wontech kor(index.html) 데모 시드
//   - cons_cache: hospital_regions (지역 매핑)
//   - CRM 제네릭({id,data}): customers / pipeline / quotes / logs (라이트)
//   ※ main/device 는 HTML 임베디드 상수(가짜 스크램블)를 사용하므로 여기선 미시드
//     ilbo_pending 은 seed_consumables 가, pending_sales(korea) 는 seed_total 이 담당
// 실행: node sql/seed_kor.js
// ============================================================
const fs=require('fs'), https=require('https');
const BASE='https://bdkurlqmfsswgeiujyev.supabase.co';
const KEY=fs.readFileSync(process.env.WT_SECRET_FILE||'C:/Users/user/Desktop/메모장.txt','utf8').trim();
function api(m,p,b,e){return new Promise((res,rej)=>{const data=b!=null?JSON.stringify(b):null;const u=new URL(BASE+p);const rq=https.request(u,{method:m,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation',...(e||{}),...(data?{'Content-Length':Buffer.byteLength(data)}:{})}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:d}));});rq.on('error',rej);if(data)rq.write(data);rq.end();});}
const rest=(m,t,b,h)=>api(m,'/rest/v1/'+t,b,h);
const rand=a=>a[Math.floor(Math.random()*a.length)], ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pad=n=>String(n).padStart(2,'0');
const HPRE=['서울','강남','부산','대구','인천','수원','성남','대전','광주','울산','청담','분당','일산','목동'];
const HSUF=['미래의원','스킨클리닉','더마피부과','라인의원','뷰티클리닉','성형외과','365의원','에스의원'];
const PRODS=['아우라 1','루미 2','피코프로 3','비전레이저 4','펄스RF 5'];
const REPS=['김서연','이준호','박도윤','최지우','정하은'];
const fakeHosp=i=>rand(HPRE)+rand(HSUF)+(100+i);

function buildRegions(){
  const kw={서울:['서울','강남구'],강남:['서울','강남구'],청담:['서울','강남구'],목동:['서울','양천구'],
    부산:['부산','해운대구'],대구:['대구','수성구'],인천:['인천','남동구'],송도:['인천','연수구'],
    수원:['경기','수원시'],성남:['경기','성남시'],분당:['경기','성남시'],일산:['경기','고양시'],
    대전:['대전','유성구'],광주:['광주','서구'],울산:['울산','남구']};
  return {regions:{},kw};
}
function buildQuotes(n){return Array.from({length:n},(_,i)=>{const items=Array.from({length:ri(1,3)},()=>{const price=ri(300,900)*10000,qty=ri(1,3);return {name:rand(PRODS),qty,price,discount:0,amount:price*qty};});
  const subtotal=items.reduce((s,x)=>s+x.amount,0),discountAmt=Math.round(subtotal*0.05),vat=Math.round((subtotal-discountAmt)*0.1);
  return {id:'Q2026'+pad(ri(1,7))+pad(ri(1,28))+'-'+pad(i+1),data:{id:'Q2026'+pad(ri(1,7))+pad(ri(1,28))+'-'+pad(i+1),custName:fakeHosp(i),quoteDate:'2026-07-'+pad(ri(1,20)),validUntil:'2026-08-'+pad(ri(1,28)),sales:rand(REPS),status:rand(['작성','발송','수주']),note:'',subtotal,discountAmt,vat,total:subtotal-discountAmt+vat,items}};});}
function buildCustomers(n){return Array.from({length:n},(_,i)=>({id:'cust'+i,data:{id:'cust'+i,custName:fakeHosp(i),region:rand(['서울','경기','부산','대구','인천']),grade:rand(['A','B','C']),owner:rand(REPS),phone:'02-'+ri(200,999)+'-'+ri(1000,9999),memo:''}}));}
function buildPipeline(n){return Array.from({length:n},(_,i)=>({id:'pipe'+i,data:{id:'pipe'+i,custName:fakeHosp(i),model:rand(PRODS),sales:rand(REPS),stage:rand(['리드','상담','견적','계약임박','수주']),amount:ri(30,90)*1000000,stageUpdatedAt:'2026-07-'+pad(ri(1,20))}}));}
function buildLogs(n){return Array.from({length:n},(_,i)=>({id:'log'+i,data:{id:'log'+i,date:'2026-07-'+pad(ri(1,22)),custName:fakeHosp(i),type:rand(['방문','전화','이메일','데모']),content:'데모 활동 기록',product:rand(PRODS),nextAction:'',nextDate:'',sales:rand(REPS)}}));}

module.exports={buildRegions,buildQuotes,buildCustomers,buildPipeline,buildLogs};
if(require.main!==module) return;
async function putCC(key,data){await rest('DELETE','cons_cache?key=eq.'+encodeURIComponent(key));const r=await rest('POST','cons_cache',{key,data,updated_at:new Date().toISOString()});console.log('  cons_cache['+key+'] ->',r.status);}
async function putRows(table,rows){await rest('DELETE',table+'?id=not.is.null');const r=await rest('POST',table,rows);console.log('  '+table+' ->',r.status,r.status>=300?r.body.slice(0,160):'('+rows.length+')');}
(async()=>{
  console.log('== kor 시드 ==');
  await putCC('hospital_regions',buildRegions());
  await putRows('customers',buildCustomers(8));
  await putRows('pipeline',buildPipeline(6));
  await putRows('quotes',buildQuotes(4));
  await putRows('logs',buildLogs(10));
  // access 'korea' 보장
  const q=await rest('GET','crm_profiles?select=id,access'); let list=[];try{list=JSON.parse(q.body);}catch(_){}
  for(const p of list){const acc=new Set(String(p.access||'').split(',').map(s=>s.trim()).filter(Boolean));acc.add('korea');await rest('PATCH','crm_profiles?id=eq.'+p.id,{access:Array.from(acc).join(',')});}
  console.log('  crm_profiles +korea ->',list.length,'명');
})().catch(e=>{console.error(e);process.exit(1);});
