// ============================================================
// Biz Suite Template — 앱 로직 (뼈대)
// 로그인 · 권한 · 런처 · CRM데모 · 관리자콘솔 · 요청신고 위젯
// ============================================================
const _sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
let _me = { id:null, email:'', name:'', role:'user', access:[], isAdmin:false };
let _registry = [];

const $ = id => document.getElementById(id);
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const show = (id,on)=>{ const e=$(id); if(e) e.classList.toggle('hidden', !on); };

// ── 초기화 ──────────────────────────────────────────────────
async function init(){
  if($('login-title')) $('login-title').textContent = window.APP_NAME||'Biz Suite';
  // 비밀번호 재설정 링크(#type=recovery)
  const hp = new URLSearchParams(location.hash.replace('#',''));
  if(hp.get('type')==='recovery'){
    show('login-form',false); show('forgot-form',false); show('reset-form',true);
    return;
  }
  const { data:{ session } } = await _sb.auth.getSession();
  if(!session){ return; }  // 로그인 화면 유지
  await afterLogin(session.user);
}

async function afterLogin(user){
  const { data:p } = await _sb.from('app_profiles').select('*').eq('id', user.id).single();
  if(!p){ await doLogout(); return; }
  _me = {
    id:user.id, email:user.email, name:p.display_name||user.email.split('@')[0],
    role:p.role||'user', access:(p.access||'').split(',').map(s=>s.trim()).filter(Boolean),
    isAdmin:p.role==='admin'
  };
  const { data:reg } = await _sb.from('site_registry').select('*').order('sort_order');
  _registry = reg||[];
  $('login').classList.add('hidden');
  renderLauncher();
  mountFeedback();
}

// ── 로그인/로그아웃 ─────────────────────────────────────────
async function doLogin(){
  const email=$('li-email').value.trim(), pw=$('li-pw').value;
  const m=$('li-msg'); m.style.display='none';
  const { data, error } = await _sb.auth.signInWithPassword({ email, password:pw });
  if(error){ m.textContent='로그인 실패: 이메일/비밀번호를 확인하세요.'; m.style.display='block'; return; }
  await afterLogin(data.user);
}
async function doLogout(){ await _sb.auth.signOut(); location.href=location.pathname; }

function showForgot(){ show('login-form',false); show('forgot-form',true); $('fo-email').value=$('li-email').value; }
function hideForgot(){ show('forgot-form',false); show('login-form',true); }
async function doForgot(){
  const email=$('fo-email').value.trim(), m=$('fo-msg'); m.style.display='block';
  if(!email){ m.style.color='#dc2626'; m.textContent='이메일을 입력하세요.'; return; }
  const { error } = await _sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin+location.pathname });
  if(error){ m.style.color='#dc2626'; m.textContent = error.status===429?'잠시 후 다시 시도하세요.':'오류: '+error.message; return; }
  m.style.color='#16a34a'; m.textContent='재설정 링크를 발송했습니다. 메일함(스팸함 포함)을 확인하세요.';
}
async function doReset(){
  const pw=$('rs-pw').value, m=$('rs-msg'); m.style.display='block';
  if(pw.length<6){ m.style.color='#dc2626'; m.textContent='6자 이상 입력하세요.'; return; }
  const { error } = await _sb.auth.updateUser({ password:pw });
  if(error){ m.style.color='#dc2626'; m.textContent='오류: '+error.message; return; }
  m.style.color='#16a34a'; m.textContent='변경 완료. 잠시 후 로그인 화면으로 이동합니다.';
  setTimeout(()=>{ location.href=location.pathname; }, 1800);
}

// ── 런처 (권한 있는 사이트만 카드) ──────────────────────────
function siteVisible(s){
  if(_me.access.includes(s.key)) return true;
  if(s.admin_bypass && _me.isAdmin) return true;
  if(s.extra_visible_rule){ try{ return !!(new Function('access','isAdmin','return ('+s.extra_visible_rule+')'))(_me.access,_me.isAdmin); }catch(e){ return false; } }
  return false;
}
function renderLauncher(){
  $('launcher-hi').textContent = _me.name+'님, 접근 가능한 사이트를 선택하세요.';
  const cards = _registry.filter(siteVisible).map(s=>{
    const onclick = s.url==='LOCAL' ? "enterCRM()" : ("location.href='"+s.url+"'");
    return `<div class="lc-card" onclick="${onclick}">
      <div style="height:5px;background:linear-gradient(90deg,${s.grad_from},${s.grad_to})"></div>
      <div style="padding:26px 22px">
        <div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,${s.grad_from},${s.grad_to});display:flex;align-items:center;justify-content:center;margin-bottom:14px"><i class="bi ${s.icon}" style="font-size:21px;color:#fff"></i></div>
        <div style="font-size:15px;font-weight:800;margin-bottom:5px">${esc(s.title)}</div>
        <div style="font-size:11px;color:#64748b;line-height:1.6">${s.body_html}</div>
        <div style="margin-top:14px;font-size:11px;color:${s.accent_color};font-weight:600">입장하기 <i class="bi bi-arrow-right"></i></div>
      </div></div>`;
  }).join('');
  $('lc-grid').innerHTML = cards || '<div style="color:#64748b">부여된 접근 권한이 없습니다. 관리자에게 문의하세요.</div>';
  show('btn-admin', _me.isAdmin);
  $('launcher').style.display='flex';
  $('app').style.display='none';
}
function backToLauncher(){ $('app').style.display='none'; renderLauncher(); }

// ── CRM 데모 페이지 ─────────────────────────────────────────
const STAGE_C = {'리드':'#64748b','상담중':'#3b82f6','견적':'#f59e0b','계약':'#16a34a','보류':'#94a3b8'};
async function enterCRM(){
  $('launcher').style.display='none'; $('app').style.display='block';
  $('app-title').textContent='영업 관리'; $('app-user').textContent=_me.name+' · '+_me.email;
  show('page-crm',true); show('page-admin',false);
  const { data } = await _sb.from('demo_customers').select('*').order('amount',{ascending:false});
  const rows=(data||[]).map(c=>`<tr>
    <td style="font-weight:600">${esc(c.name)}</td><td>${esc(c.owner)}</td><td style="color:#94a3b8">${esc(c.region)}</td>
    <td><span class="chip" style="background:${STAGE_C[c.stage]||'#334155'}33;color:${STAGE_C[c.stage]||'#cbd5e1'}">${esc(c.stage)}</span></td>
    <td>${Number(c.amount||0).toLocaleString()}</td><td style="color:#94a3b8">${esc(c.memo)}</td></tr>`).join('');
  $('crm-rows').innerHTML = rows || '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:24px">데이터 없음</td></tr>';
}
async function addCustomer(){
  const name=prompt('거래처명:'); if(!name) return;
  await _sb.from('demo_customers').insert({ name, owner:_me.name, stage:'리드', amount:0 });
  enterCRM();
}

// ── 관리자 콘솔 (사용자·권한) ───────────────────────────────
async function enterAdmin(){ await enterCRM(); $('app-title').textContent='관리자'; show('page-crm',false); show('page-admin',true); renderAdmin(); }
async function renderAdmin(){
  const box=$('page-admin');
  box.innerHTML='<h3 style="font-size:16px;margin:0 0 16px">사용자 · 권한 관리</h3><div id="adm-users">불러오는 중...</div>';
  const { data:us } = await _sb.from('app_profiles').select('*').order('dept').order('display_name');
  const sites=_registry;
  const rows=(us||[]).map(u=>{
    const acc=(u.access||'').split(',').map(s=>s.trim());
    const checks=sites.map(s=>`<label style="display:inline-flex;flex-direction:column;align-items:center;font-size:9px;color:#94a3b8;margin-right:10px"><span>${esc(s.short_label)}</span><input type="checkbox" ${acc.includes(s.key)?'checked':''} onchange="toggleAccess('${u.id}','${s.key}',this.checked)" style="accent-color:${s.matrix_color}"></label>`).join('');
    return `<tr><td>${esc(u.email)}</td><td>${esc(u.display_name)}</td><td style="color:#94a3b8">${esc(u.dept)} ${esc(u.position)}</td>
      <td><select onchange="setRole('${u.id}',this.value)" style="width:auto">
        <option value="user" ${u.role==='user'?'selected':''}>팀원</option>
        <option value="manager" ${u.role==='manager'?'selected':''}>팀장</option>
        <option value="admin" ${u.role==='admin'?'selected':''}>관리자</option></select></td>
      <td>${checks}</td></tr>`;
  }).join('');
  $('adm-users').innerHTML = `<div style="background:rgba(255,255,255,.03);border:1px solid #1e293b;border-radius:14px;overflow:auto">
    <table><thead><tr><th>이메일</th><th>이름</th><th>부서/직급</th><th>역할</th><th>접근 권한</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
async function toggleAccess(id,key,on){
  const { data:u } = await _sb.from('app_profiles').select('access').eq('id',id).single();
  const set=new Set((u?.access||'').split(',').map(s=>s.trim()).filter(Boolean));
  on?set.add(key):set.delete(key);
  await _sb.from('app_profiles').update({ access:[...set].sort().join(',') }).eq('id',id);
}
async function setRole(id,role){ await _sb.from('app_profiles').update({ role }).eq('id',id); }

// ── 요청·신고 위젯 (전 페이지 공통) ─────────────────────────
function mountFeedback(){
  if($('fb-btn')) return;
  const site='biz-suite', page=(location.pathname.split('/').pop()||'index.html');
  const b=document.createElement('div'); b.id='fb-btn'; b.textContent='🙋 요청·신고';
  b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9990;background:#334155;color:#e2e8f0;padding:8px 14px;border-radius:20px;font-size:12px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)';
  const p=document.createElement('div'); p.id='fb-panel';
  p.style.cssText='display:none;position:fixed;right:18px;bottom:60px;z-index:9991;width:min(320px,90vw);background:#1e293b;border:1px solid #334155;border-radius:12px;padding:14px';
  p.innerHTML='<div style="font-weight:700;font-size:13px;margin-bottom:8px">요청 · 불편신고</div><textarea id="fb-msg" placeholder="내용을 적어주세요" style="width:100%;height:80px;resize:none"></textarea><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn btn-g" onclick="document.getElementById(\'fb-panel\').style.display=\'none\'">닫기</button><button class="btn btn-p" onclick="sendFb()">전송</button></div>';
  document.body.appendChild(b); document.body.appendChild(p);
  b.onclick=()=>{ p.style.display=p.style.display==='none'?'block':'none'; };
  window.sendFb=async()=>{
    const m=$('fb-msg').value.trim(); if(!m) return;
    await _sb.from('site_feedback').insert({ site, page, message:m.slice(0,2000), reporter:_me.email||null });
    p.innerHTML='<div style="color:#5eead4;text-align:center;padding:14px">접수되었습니다! 감사합니다 🙏</div>';
    setTimeout(()=>{ p.style.display='none'; },1500);
  };
  // 오류 자동수집
  window.addEventListener('error',e=>{ if(!e||!e.message) return;
    _sb.from('site_errors').insert({ site, page, href:location.href.slice(0,500), message:String(e.message).slice(0,500), source:String(e.filename||'').slice(0,300), line:e.lineno||null, ua:navigator.userAgent.slice(0,300), user_email:_me.email||null }); });
}

init();
