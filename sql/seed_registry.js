// ============================================================
// site_registry 시드 — 데모 7개 사이트(사이트 이동 스위처용)
// 실행: node sql/seed_registry.js
// ============================================================
const fs=require('fs'), https=require('https');
const BASE='https://bdkurlqmfsswgeiujyev.supabase.co';
const KEY=fs.readFileSync(process.env.WT_SECRET_FILE||'C:/Users/user/Desktop/메모장.txt','utf8').trim();
function api(m,p,b){return new Promise((res,rej)=>{const data=b!=null?JSON.stringify(b):null;const u=new URL(BASE+p);const rq=https.request(u,{method:m,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation',...(data?{'Content-Length':Buffer.byteLength(data)}:{})}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:d}));});rq.on('error',rej);if(data)rq.write(data);rq.end();});}
const D='https://pmw0406.github.io/biz-suite-template/';
const SITES=[
  {key:'total',       badge:'종합', short_label:'전사종합', title:'전사 종합 경영현황', body_html:'국내+해외 통합 경영 현황', icon:'📊', grad_from:'#4f46e5', grad_to:'#6366f1', accent_color:'#4f46e5', matrix_color:'#4f46e5', url:D+'total.html',        sort_order:1},
  {key:'korea',       badge:'KR',   short_label:'한국영업', title:'한국 영업',          body_html:'영업관리 · 소모품 · 고객사', icon:'🇰🇷', grad_from:'#0891b2', grad_to:'#06b6d4', accent_color:'#0891b2', matrix_color:'#0891b2', url:'LOCAL',               sort_order:2},
  {key:'us',          badge:'US',   short_label:'미국법인', title:'미국법인 ERP',       body_html:'매출인식 · 수금 · 미수 · CRM', icon:'🇺🇸', grad_from:'#2563eb', grad_to:'#3b82f6', accent_color:'#2563eb', matrix_color:'#2563eb', url:D+'us.html',           sort_order:3},
  {key:'th',          badge:'TH',   short_label:'태국법인', title:'태국법인 ERP',       body_html:'매출인식 · 수금 · 미수 · 비용', icon:'🇹🇭', grad_from:'#f59e0b', grad_to:'#fbbf24', accent_color:'#f59e0b', matrix_color:'#f59e0b', url:D+'th.html',           sort_order:4},
  {key:'ar',          badge:'AR',   short_label:'미수금',   title:'국내 미수금 관리',   body_html:'채권 · 관리대상 · 임원보고', icon:'💳', grad_from:'#dc2626', grad_to:'#ef4444', accent_color:'#dc2626', matrix_color:'#dc2626', url:D+'receivables.html',  sort_order:5},
  {key:'daily',       badge:'일보', short_label:'일일보고', title:'일일매출보고',       body_html:'소모품 · 전사 일 매출', icon:'🧾', grad_from:'#16a34a', grad_to:'#22c55e', accent_color:'#16a34a', matrix_color:'#16a34a', url:D+'ilbo.html',         sort_order:6},
  {key:'consumables', badge:'소모품',short_label:'소모품',  title:'소모품 매출',        body_html:'아우라 소모품 · 샘플몰', icon:'🧴', grad_from:'#7c3aed', grad_to:'#8b5cf6', accent_color:'#7c3aed', matrix_color:'#7c3aed', url:D+'consumables.html',  sort_order:7},
];
if(require.main!==module){ module.exports={SITES}; return; }
(async()=>{
  const rows=SITES.map(s=>({...s, needs_token:false, admin_bypass:true, extra_visible_rule:null}));
  await api('DELETE','/rest/v1/site_registry?key=not.is.null');
  const r=await api('POST','/rest/v1/site_registry',rows);
  console.log('site_registry ->',r.status, r.status>=300?r.body.slice(0,240):'('+rows.length+' 사이트)');
})().catch(e=>{console.error(e);process.exit(1);});
