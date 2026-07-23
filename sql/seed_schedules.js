// ============================================================
// demo_schedules 데모 시드 (kor 일정 기능) — 플랫 컬럼
//   kor은 date>=today && date<=today+7 만 표시하므로, 시드는
//   "실행일 기준 향후 7일"에 걸쳐 날짜를 넣어 항상 보이게 함.
// 실행: node sql/seed_schedules.js
// ============================================================
const fs=require('fs'), https=require('https');
const BASE='https://bdkurlqmfsswgeiujyev.supabase.co';
const KEY=fs.readFileSync(process.env.WT_SECRET_FILE||'C:/Users/user/Desktop/메모장.txt','utf8').trim();
function api(m,p,b,e){return new Promise((res,rej)=>{const data=b!=null?JSON.stringify(b):null;const u=new URL(BASE+p);const rq=https.request(u,{method:m,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation',...(e||{}),...(data?{'Content-Length':Buffer.byteLength(data)}:{})}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:d}));});rq.on('error',rej);if(data)rq.write(data);rq.end();});}
const rest=(m,t,b,h)=>api(m,'/rest/v1/'+t,b,h);
const rand=a=>a[Math.floor(Math.random()*a.length)], ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pad=n=>String(n).padStart(2,'0');
const HOSP=['서울미래의원1001','강남스킨클리닉1002','부산더마피부과1003','대구라인의원1004','인천뷰티클리닉1005','수원성형외과1006','청담365의원1007','분당에스의원1008'];
const REPS=['김서연','이준호','박도윤','최지우','정하은'];
const PRODS=['아우라 1','루미 2','피코프로 3','비전레이저 4'];
function ds(offset){const d=new Date();d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
(async()=>{
  const rows=[];
  for(let i=0;i<10;i++){
    const off=ri(0,6);  // 오늘~+6일
    rows.push({id:'ds'+i+Math.random().toString(36).slice(2,6),
      date:ds(off), end_date:'', time:pad(ri(9,17))+':00', cust:rand(HOSP), sales:rand(REPS),
      product:rand(PRODS), content:rand(['데모 설치','제품 시연','정기 방문','견적 미팅','A/S 방문']),
      outcome:'', status:rand(['','done']), result:''});
  }
  await rest('DELETE','demo_schedules?id=not.is.null');
  const r=await rest('POST','demo_schedules',rows);
  console.log('demo_schedules ->', r.status, r.status>=300?r.body.slice(0,220):'('+rows.length+'건, '+ds(0)+'~'+ds(6)+')');
})().catch(e=>{console.error(e);process.exit(1);});
