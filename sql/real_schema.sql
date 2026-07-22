-- ============================================================
-- 실제 사이트 이식용 스키마 (원본이 읽는 테이블을 새 데모 프로젝트에 복제)
-- 실행: Supabase 대시보드 > SQL Editor > 붙여넣기 > Run
-- 회사 데이터 없음. 값은 seed 스크립트로 가짜 주입.
-- ============================================================

-- 사용자 프로필 (원본은 crm_profiles 사용 — 골격 템플릿의 app_profiles와 별개)
create table if not exists public.crm_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, display_name text, dept text, position text,
  role text default 'user', access text default '', upload text default '', temp_pw text,
  created_at timestamptz default now()
);
alter table public.crm_profiles enable row level security;
drop policy if exists "crm_profiles_all_auth" on public.crm_profiles;
create policy "crm_profiles_all_auth" on public.crm_profiles for all to authenticated using (true) with check (true);

-- 집계 캐시 (key별 큰 JSON blob: main/intl/device/export_tower/region_map/sales_targets/ilbo_pending)
create table if not exists public.cons_cache (
  key text primary key,
  data jsonb,
  updated_at timestamptz default now()
);
alter table public.cons_cache enable row level security;
drop policy if exists "cons_cache_read_all" on public.cons_cache;
create policy "cons_cache_read_all" on public.cons_cache for select to anon, authenticated using (true);
drop policy if exists "cons_cache_write_auth" on public.cons_cache;
create policy "cons_cache_write_auth" on public.cons_cache for all to authenticated using (true) with check (true);

-- 활동 로그 (CRM 방문·일정 등)
create table if not exists public.logs (
  id text primary key,
  data jsonb,
  created_at timestamptz default now()
);
alter table public.logs enable row level security;
drop policy if exists "logs_all_auth" on public.logs;
create policy "logs_all_auth" on public.logs for all to authenticated using (true) with check (true);

-- 목표
create table if not exists public.targets ( id text primary key, data jsonb, updated_at timestamptz default now() );
alter table public.targets enable row level security;
drop policy if exists "targets_all_auth" on public.targets;
create policy "targets_all_auth" on public.targets for all to authenticated using (true) with check (true);

-- sales_targets: total.html 은 select('year,month,dept,item,amount') 플랫 컬럼으로 읽음
-- (단, 데모는 cons_cache 'sales_targets' blob 을 우선 사용하므로 이 테이블은 폴백/비어도 됨)
create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(),
  year int, month int, dept text, item text, amount numeric,
  updated_at timestamptz default now()
);
alter table public.sales_targets enable row level security;
drop policy if exists "sales_targets_all_auth" on public.sales_targets;
create policy "sales_targets_all_auth" on public.sales_targets for all to authenticated using (true) with check (true);

-- pending_sales: total.html 은 select('*') 후 flat 컬럼(hospital/product/category/amount/qty/expected_date/status/channel/region)으로 읽음
create table if not exists public.pending_sales (
  id uuid primary key default gen_random_uuid(),
  hospital text, product text, category text,
  amount numeric, qty numeric, expected_date date,
  status text, channel text, region text,
  created_at timestamptz default now()
);
alter table public.pending_sales enable row level security;
drop policy if exists "pending_sales_all_auth" on public.pending_sales;
create policy "pending_sales_all_auth" on public.pending_sales for all to authenticated using (true) with check (true);
drop policy if exists "pending_sales_read_all" on public.pending_sales;
create policy "pending_sales_read_all" on public.pending_sales for select to anon, authenticated using (true);

-- site_registry / dept_perms / site_feedback / site_errors 는 schema.sql 과 동일 정의 재사용
-- (이미 만들었으면 생략 가능)

notify pgrst, 'reload schema';

-- ⚠️ 각 사이트가 실제로 읽는 테이블만 확인해서 필요한 것만 생성하면 됨.
--    파악법: grep -oE "_sb\.from\('[^']+'\)" <파일>
