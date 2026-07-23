// ============================================================
// wt-corps 데모 시드: cons_cache key='corp_us_erp' / 'corp_th_erp'
// 단일 blob D. us=풀셋(clients/deals/acts/tasks/snapshots/shipments/psi),
// th=서브셋 + expenses. 실행: node sql/seed_corps.js  (require.main 가드)
// ============================================================
const fs=require('fs'), https=require('https');
const BASE='https://bdkurlqmfsswgeiujyev.supabase.co';
const KEY=fs.readFileSync(process.env.WT_SECRET_FILE||'C:/Users/user/Desktop/메모장.txt','utf8').trim();
function api(method,path,body,extra){return new Promise((res,rej)=>{const data=body!=null?JSON.stringify(body):null;const u=new URL(BASE+path);const req=https.request(u,{method,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation',...(extra||{}),...(data?{'Content-Length':Buffer.byteLength(data)}:{})}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:d}));});req.on('error',rej);if(data)req.write(data);req.end();});}
const rest=(m,t,b,h)=>api(m,'/rest/v1/'+t,b,h);
const rand=a=>a[Math.floor(Math.random()*a.length)], ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const id=p=>p+Math.random().toString(36).slice(2,8);
const pad=n=>String(n).padStart(2,'0');
const dstr=(y,m,d)=>y+'-'+pad(m)+'-'+pad(d);
const MONTHS=[[2025,[1,2,3,4,5,6,7,8,9,10,11,12]],[2026,[1,2,3,4,5,6,7]]];

const US_CLIENTS=['Sunrise Veterinary Diagnostics','Pacific Animal Health','National Vet Labs','Summit Diagnostics Inc','BioVet Supply Co','Grandview Animal Lab','Cedar Valley Vet Diagnostics','Heritage BioReagents'];
const TH_CLIENTS=['Bangkok Vet Diagnostics','Siam Animal Health','Phuket Veterinary Lab','Chiang Mai BioDiagnostics','Pattaya Animal Clinic','Nonthaburi Vet Supply'];
const DEV_PROD=['AniGen IF-100','BioPCR P-200','ChemiPro C-300'];        // 장비(대당 고가)
const CONS_PROD=['Parvo Antigen Kit','Heartworm Kit','ImmunoStrip']; // 소모품
const ALL_PROD=DEV_PROD.concat(CONS_PROD);
const isDev=p=>DEV_PROD.includes(p);
const ORDER_ST=['수주','생산중','선적중','완료'];

function genSales(clients, unitScale){          // unitScale: 통화별 단가 배율
  const sales=[];
  MONTHS.forEach(([y,mos])=>mos.forEach(mo=>{
    const n=ri(3,7);
    for(let i=0;i<n;i++){
      const prod=rand(ALL_PROD), dev=isDev(prod);
      const qty=dev?ri(1,3):ri(5,40);
      const unit=(dev?ri(35,85)*1000:ri(120,420))*unitScale;
      const amt=Math.round(qty*unit);
      const date=dstr(y,mo,ri(3,26));
      // 수금: 과거일수록 완납, 최근은 부분/미수
      const cols=[]; const isRecent=(y===2026&&mo>=5);
      if(!isRecent||Math.random()<0.6){
        const paidRatio=isRecent?(0.3+Math.random()*0.5):1;
        const paid=Math.round(amt*paidRatio);
        cols.push({id:id('col'),date:dstr(y,mo,ri(26,28)),amt:paid,ref:paidRatio>=1?'전액 수금':'부분 수금'});
      }
      sales.push({id:id('sl'),date,client:rand(clients),product:prod,qty,amt,memo:'',collections:cols});
    }
  }));
  return sales;
}
function genOrders(clients,unitScale){
  const o=[]; for(let i=0;i<16;i++){const prod=rand(ALL_PROD),dev=isDev(prod);const qty=dev?ri(1,5):ri(10,50);
    const amt=Math.round(qty*(dev?ri(18,42)*1000:ri(60,240))*unitScale);
    o.push({id:id('od'),date:dstr(2026,ri(5,7),ri(1,26)),client:rand(clients),product:prod,qty,amt,status:rand(ORDER_ST),eta:dstr(2026,ri(7,9),ri(1,26)),memo:''});}
  return o;
}
function genFunds(unitScale){
  const f=[]; const accs=['주거래계좌','급여계좌'];
  MONTHS.forEach(([y,mos])=>mos.forEach(mo=>{
    f.push({id:id('fd'),date:dstr(y,mo,ri(1,10)),kind:'입금',account:'주거래계좌',category:'매출수금',amt:Math.round(ri(20,90)*1000*unitScale),memo:''});
    f.push({id:id('fd'),date:dstr(y,mo,25),kind:'출금',account:'급여계좌',category:'급여',amt:Math.round(ri(8,20)*1000*unitScale),memo:''});
    if(Math.random()<0.5) f.push({id:id('fd'),date:dstr(y,mo,ri(11,20)),kind:'출금',account:'주거래계좌',category:rand(['임대료','마케팅','물류']),amt:Math.round(ri(2,9)*1000*unitScale),memo:''});
  }));
  return f;
}
function genItems(){return CONS_PROD.concat(DEV_PROD).map((n,i)=>({id:id('it'),name:n,qty0:ri(5,40),unit:'EA',safety:ri(3,10),loc:'창고'+(i%2+1)}));}
function genMoves(items){const m=[];items.forEach(it=>{for(let k=0;k<ri(1,3);k++)m.push({id:id('mv'),date:dstr(2026,ri(3,7),ri(1,26)),type:rand(['입고','출고']),item:it.name,qty:ri(1,10),ref:''});});return m;}
function genEquip(clients,us){const e=[];for(let i=0;i<8;i++){const st=rand(['재고','출고','설치','AS']);const rec={id:id('eq'),serial:'ND-'+rand(['AX','LM','PP'])+'-'+ri(1000,9999),item:rand(DEV_PROD),status:st,client:st==='재고'?'':rand(clients),inDate:dstr(2025,ri(6,12),ri(1,26)),shipRef:'SH-'+ri(2000,2999),outDate:st==='재고'?'':dstr(2026,ri(1,6),ri(1,26)),note:'',events:[{date:dstr(2025,ri(6,12),ri(1,26)),type:'입고',detail:''}]};if(us)rec.outRef=st==='재고'?'':'OUT-'+ri(100,999);e.push(rec);}return e;}
function genTargets(unitScale){const t={};MONTHS.forEach(([y,mos])=>mos.forEach(mo=>{t[y+'-'+pad(mo)]=Math.round(ri(120,220)*1000*unitScale);}));return t;}

function blankUS(){return {v:3,rate:1350,targets:{},accounts:[{name:'주거래계좌',opening:50000},{name:'급여계좌',opening:8000}],
  sales:[],orders:[],items:[],moves:[],funds:[],expenses:[],clients:[],deals:[],acts:[],tasks:[],snapshots:[],shipments:[],equipment:[],psi:[]};}
function blankTH(){return {v:2,rate:38,targets:{},accounts:[{name:'주거래계좌',opening:2000000},{name:'급여계좌',opening:400000}],
  sales:[],orders:[],items:[],moves:[],funds:[],expenses:[],equipment:[]};}

function buildUS(){
  const D=blankUS(); const cl=US_CLIENTS;
  D.sales=genSales(cl,1); D.orders=genOrders(cl,1); D.funds=genFunds(1);
  D.items=genItems(); D.moves=genMoves(D.items); D.equipment=genEquip(cl,true); D.targets=genTargets(1);
  D.clients=cl.map((n,i)=>({id:id('cl'),name:n,contact:'Manager '+(i+1),phone:'(2'+ri(10,99)+') 555-0'+ri(100,199),email:'contact'+i+'@'+n.toLowerCase().replace(/[^a-z]/g,'')+'.demo',region:rand(['NY','CA','IL','CO','FL','WA','MA']),grade:rand(['A','B','C']),status:rand(['활성','잠재']),memo:'',address:ri(10,900)+' Main St',lat:0,lng:0}));
  D.deals=cl.slice(0,5).map((n,i)=>({id:id('dl'),client:n,product:rand(DEV_PROD),qty:ri(1,3),amt:ri(30,90)*1000,stage:rand(['리드','상담중','견적발송','협의중','계약완료']),prob:ri(20,90),expected:dstr(2026,ri(7,10),ri(1,26)),owner:'Demo Rep',next:'follow-up',nextDate:dstr(2026,8,ri(1,26)),memo:'',created:dstr(2026,ri(3,6),1),stageAt:dstr(2026,ri(6,7),1)}));
  D.acts=Array.from({length:10},()=>({id:id('ac'),date:dstr(2026,ri(5,7),ri(1,26)),type:rand(['미팅','콜','방문','이메일','AS']),client:rand(cl),content:'데모 활동 기록',next:'',nextDate:'',doneNext:false}));
  D.tasks=Array.from({length:6},()=>({id:id('tk'),title:rand(['견적 발송','샘플 배송','설치 방문','수금 확인']),date:dstr(2026,7,ri(1,28)),time:pad(ri(9,17))+':00',owner:'Demo Rep',memo:'',done:Math.random()<0.4}));
  D.shipments=Array.from({length:4},()=>({id:id('sh'),shipRef:'SH-'+ri(2000,2999),date:dstr(2026,ri(4,7),ri(1,26)),item:rand(DEV_PROD),qty:ri(2,8),eta:dstr(2026,ri(7,9),ri(1,26)),status:rand(['shipped','received']),receivedDate:'',recvQty:null,serials:'',moveId:''}));
  D.snapshots=[2,3,4,5,6].map(mo=>({ym:'2026-'+pad(mo),sale:ri(120,260)*1000,pay:ri(100,240)*1000,out:ri(20,90)*1000,bal:ri(50,180)*1000,achv:ri(80,130),payRate:ri(70,100),rate:1350,at:dstr(2026,mo,28)}));
  D.psi=DEV_PROD.concat(CONS_PROD).map(m=>({id:id('ps'),model:m,kind:isDev(m)?'device':'consumable',link:'',remark:'',months:Object.fromEntries(['2026-05','2026-06','2026-07'].map(k=>[k,{p:ri(5,30),s:ri(5,25),sellable:ri(3,20),nonSellable:ri(0,5)}]))}));
  return D;
}
function buildTH(){
  const D=blankTH(); const cl=TH_CLIENTS; const sc=28;  // THB 단가 배율(≈USD*28로 규모감)
  D.sales=genSales(cl,sc); D.orders=genOrders(cl,sc); D.funds=genFunds(sc);
  D.items=genItems(); D.moves=genMoves(D.items); D.equipment=genEquip(cl,false); D.targets=genTargets(sc);
  D.expenses=[]; MONTHS.forEach(([y,mos])=>mos.forEach(mo=>{if(Math.random()<0.8)D.expenses.push({id:id('ex'),ym:y+'-'+pad(mo),category:rand(['임대료','마케팅','인건비','물류','기타']),amt:Math.round(ri(30,120)*1000*sc/10),memo:''});}));
  return D;
}

module.exports={buildUS,buildTH,US_CLIENTS,TH_CLIENTS,DEV_PROD,CONS_PROD};
if(require.main!==module) return;

async function putCache(key,data){await rest('DELETE','cons_cache?key=eq.'+encodeURIComponent(key));const r=await rest('POST','cons_cache',{key,data,updated_at:new Date().toISOString()});console.log('  cons_cache['+key+'] ->',r.status,r.status>=300?r.body.slice(0,200):'');}
(async()=>{
  console.log('== wt-corps 시드 ==');
  await putCache('corp_us_erp', buildUS());
  await putCache('corp_th_erp', buildTH());
  // 데모 계정 access 확장(us,th 접근 허용) — admin은 role로 통과, manager/user에 추가
  const q=await rest('GET','crm_profiles?select=id,email,access');
  let list=[]; try{list=JSON.parse(q.body);}catch(e){}
  for(const p of list){
    const acc=new Set(String(p.access||'').split(',').map(s=>s.trim()).filter(Boolean));
    ['us','th'].forEach(a=>acc.add(a));
    if(p.email==='user@demo.local'){} // user도 열어둠(포트폴리오)
    await rest('PATCH','crm_profiles?id=eq.'+p.id,{access:Array.from(acc).join(',')});
  }
  console.log('  crm_profiles access +us,th ->', list.length,'명');
  console.log('\n완료. corp_us_erp / corp_th_erp 주입. site_registry 는 seed_registry 에서.');
})().catch(e=>{console.error(e);process.exit(1);});
