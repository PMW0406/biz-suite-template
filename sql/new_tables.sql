-- ============================================================
-- 나머지 사이트 이식용 신규 테이블 (Supabase SQL Editor에서 Run)
--   대상: wt-corps(us/th)·wt-receivables·wt-consumables·wontech(kor)
--   실행: 대시보드 > SQL Editor > 붙여넣기 > Run
-- ============================================================

-- 1) site_registry — 런처/사이트 스위처 (us/th/receivables 가 읽음)
create table if not exists public.site_registry (
  key text primary key,
  badge text, short_label text, matrix_color text, title text, body_html text,
  icon text, grad_from text, grad_to text, accent_color text,
  url text, needs_token boolean default false, admin_bypass boolean default true,
  extra_visible_rule text, sort_order int default 0
);
alter table public.site_registry enable row level security;
drop policy if exists "site_registry_read_all" on public.site_registry;
create policy "site_registry_read_all" on public.site_registry for select to anon, authenticated using (true);
drop policy if exists "site_registry_write_auth" on public.site_registry;
create policy "site_registry_write_auth" on public.site_registry for all to authenticated using (true) with check (true);

-- 2) consumables_report — 소모품 index.html (키 'aura_cons'/'samplemall')
create table if not exists public.consumables_report (
  key text primary key, data jsonb, updated_at timestamptz default now()
);
alter table public.consumables_report enable row level security;
drop policy if exists "consumables_report_read_all" on public.consumables_report;
create policy "consumables_report_read_all" on public.consumables_report for select to anon, authenticated using (true);
drop policy if exists "consumables_report_write_auth" on public.consumables_report;
create policy "consumables_report_write_auth" on public.consumables_report for all to authenticated using (true) with check (true);

-- 3) 한국 CRM 제네릭 테이블 ({id text, data jsonb}) — quotes/customers/equipments/products/pipeline
--    (logs·targets 는 이미 생성됨)
do $$
declare t text;
begin
  foreach t in array array['quotes','customers','equipments','products','pipeline'] loop
    execute format('create table if not exists public.%I (id text primary key, data jsonb, updated_at timestamptz default now())', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_read_all" on public.%I', t, t);
    -- quotes 는 공개 견적링크(?q=) 때문에 anon 읽기 허용, 나머지도 통일
    execute format('create policy "%s_read_all" on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('drop policy if exists "%s_write_auth" on public.%I', t, t);
    execute format('create policy "%s_write_auth" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

notify pgrst, 'reload schema';
