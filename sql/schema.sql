-- ============================================================
-- Biz Suite Template — 통합 스키마 (한 번에 실행)
-- 실행: Supabase 대시보드 > SQL Editor > New query > 전체 붙여넣기 > Run
-- 회사 데이터 없음. 모든 값은 예시/샘플. 새 조직에 그대로 재사용 가능.
-- ============================================================

-- ── 1) 사용자 프로필 (auth.users 확장) ──────────────────────
create table if not exists public.app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  dept text,
  position text,
  role text default 'user',        -- user | manager | admin
  access text default '',          -- 콤마구분 site key 목록 (예: 'crm,dashboard')
  upload text default '',          -- 업로드 권한 site key 목록
  temp_pw text,                    -- 관리자가 발급한 임시비밀번호(평문, 데모용)
  created_at timestamptz default now()
);
alter table public.app_profiles enable row level security;
drop policy if exists "app_profiles_all_auth" on public.app_profiles;
create policy "app_profiles_all_auth" on public.app_profiles
  for all to authenticated using (true) with check (true);

-- ── 2) 사이트 레지스트리 (런처·권한매트릭스·라우팅 단일소스) ──
create table if not exists public.site_registry (
  key text primary key,
  badge text not null,
  short_label text not null,
  matrix_color text not null,
  title text not null,
  body_html text not null,
  icon text not null,
  grad_from text not null,
  grad_to text not null,
  accent_color text not null,
  url text not null,               -- 'LOCAL' = 메인앱 자체부팅, 그 외 절대/상대 URL
  needs_token boolean not null default false,
  admin_bypass boolean not null default true,
  extra_visible_rule text,
  sort_order int not null default 0,
  updated_at timestamptz default now()
);
alter table public.site_registry enable row level security;
drop policy if exists "site_registry_all_auth" on public.site_registry;
create policy "site_registry_all_auth" on public.site_registry
  for all to authenticated using (true) with check (true);

-- ── 3) 부서별 기본권한 ──────────────────────────────────────
create table if not exists public.dept_perms (
  dept text primary key,
  access text default '',
  upload text default '',
  updated_at timestamptz default now()
);
alter table public.dept_perms enable row level security;
drop policy if exists "dept_perms_all_auth" on public.dept_perms;
create policy "dept_perms_all_auth" on public.dept_perms
  for all to authenticated using (true) with check (true);

-- ── 4) 요청·신고함 + 오류 자동수집 ─────────────────────────
create table if not exists public.site_feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  site text, page text,
  message text not null,
  reporter text,
  status text default 'new',
  admin_note text
);
alter table public.site_feedback enable row level security;
drop policy if exists "fb_insert_any" on public.site_feedback;
create policy "fb_insert_any" on public.site_feedback for insert to anon, authenticated with check (true);
drop policy if exists "fb_read_auth" on public.site_feedback;
create policy "fb_read_auth" on public.site_feedback for select to authenticated using (true);
drop policy if exists "fb_update_auth" on public.site_feedback;
create policy "fb_update_auth" on public.site_feedback for update to authenticated using (true) with check (true);

create table if not exists public.site_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  site text, page text, href text,
  message text, source text, line int, col int, stack text, ua text, user_email text
);
alter table public.site_errors enable row level security;
drop policy if exists "err_insert_any" on public.site_errors;
create policy "err_insert_any" on public.site_errors for insert to anon, authenticated with check (true);
drop policy if exists "err_read_auth" on public.site_errors;
create policy "err_read_auth" on public.site_errors for select to authenticated using (true);

-- ── 5) 샘플 업무 데이터 (CRM형 데모용) ─────────────────────
--   새 조직에선 이 부분만 업종에 맞게 교체하면 됨.
create table if not exists public.demo_customers (
  id bigint generated always as identity primary key,
  name text not null,          -- 거래처명
  owner text,                  -- 담당자(이름)
  region text,                 -- 지역
  stage text default '리드',    -- 리드|상담중|견적|계약|보류
  amount numeric default 0,    -- 예상/계약 금액
  memo text,
  created_at timestamptz default now()
);
alter table public.demo_customers enable row level security;
drop policy if exists "cust_all_auth" on public.demo_customers;
create policy "cust_all_auth" on public.demo_customers for all to authenticated using (true) with check (true);

create table if not exists public.demo_sales (
  id bigint generated always as identity primary key,
  ym text not null,            -- 'YYYY-MM'
  region text,
  product text,
  amount numeric default 0
);
alter table public.demo_sales enable row level security;
drop policy if exists "sales_all_auth" on public.demo_sales;
create policy "sales_all_auth" on public.demo_sales for all to authenticated using (true) with check (true);

-- ── 6) 사이트 레지스트리 시드 (샘플 3개 사이트) ────────────
insert into public.site_registry
  (key, badge, short_label, matrix_color, title, body_html, icon, grad_from, grad_to, accent_color, url, needs_token, admin_bypass, extra_visible_rule, sort_order)
values
  ('crm','CRM','영업','#0891b2','영업 관리','거래처 · 파이프라인<br>담당자 현황','bi-bar-chart-line-fill','#0891b2','#0d9488','#0891b2','LOCAL',false,false,null,0),
  ('dashboard','종합','종합','#4f46e5','경영 종합','매출 · 지역별<br>KPI 대시보드','bi-buildings-fill','#4f46e5','#7c3aed','#818cf8','dashboard.html',false,true,null,1),
  ('upload','보고','보고','#16a34a','일일 보고','엑셀 업로드<br>매출 집계','bi-receipt','#16a34a','#0d9488','#16a34a','upload.html',false,true,null,2)
on conflict (key) do update set
  badge=excluded.badge, short_label=excluded.short_label, matrix_color=excluded.matrix_color, title=excluded.title,
  body_html=excluded.body_html, icon=excluded.icon, grad_from=excluded.grad_from, grad_to=excluded.grad_to,
  accent_color=excluded.accent_color, url=excluded.url, needs_token=excluded.needs_token,
  admin_bypass=excluded.admin_bypass, extra_visible_rule=excluded.extra_visible_rule, sort_order=excluded.sort_order;

notify pgrst, 'reload schema';

-- ============================================================
-- 신규 사이트 추가 = site_registry에 INSERT 한 줄. 코드 수정 불필요.
-- 가짜 사용자·거래처·매출 시드 데이터는 sql/seed 스크립트(service_role 키 사용)로 별도 주입.
-- ============================================================
