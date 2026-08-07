-- ═══════════════════════════════════════════════════════════════════════════
--  노바진단(novadx) 데모 — RLS 잠금 (원텍 기준과 동일 수준)
--  목표: 비로그인(anon) 읽기·쓰기 전면 차단. 로그인 사용자만 업무 데이터 접근.
--        단, 로그인 전에 반드시 동작해야 하는 3가지만 예외로 남긴다.
--
--  Supabase → SQL Editor 에 통째로 붙여넣고 Run.
--  되돌리려면 파일 맨 아래 [ROLLBACK] 블록만 실행.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0) 관리자 판정 헬퍼 ─────────────────────────────────────────────────────
create or replace function public.nvdx_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crm_profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ── 1) 업무 테이블: 로그인 사용자만(anon 전면 차단) ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'crm_profiles','customers','quotes','products','pipeline','logs','targets',
    'equipments','pending_sales','sales_targets','demo_schedules','dept_perms'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists nvdx_auth_all on public.%I', t);
    execute format(
      'create policy nvdx_auth_all on public.%I for all to authenticated using (true) with check (true)', t);
    -- anon 용 정책은 만들지 않는다 → RLS 기본 거부
    execute format('drop policy if exists nvdx_anon_read on public.%I', t);
  end loop;
end $$;

-- ── 2) 회계 원본(cons_cache): 읽기는 로그인자, 쓰기는 핵심 키만 관리자 ──────
--     main·device·intl = 회계 매출 원본. 나머지 키(사이트별 작업데이터)는 실무자 편집 허용.
alter table public.cons_cache enable row level security;
drop policy if exists nvdx_cc_read      on public.cons_cache;
drop policy if exists nvdx_cc_write     on public.cons_cache;
drop policy if exists nvdx_cc_core      on public.cons_cache;

create policy nvdx_cc_read on public.cons_cache
  for select to authenticated using (true);

-- 일반 키: 로그인자 편집 가능
create policy nvdx_cc_write on public.cons_cache
  for all to authenticated
  using  (key not in ('main','device','intl'))
  with check (key not in ('main','device','intl'));

-- 회계 원본 3키: 관리자만
create policy nvdx_cc_core on public.cons_cache
  for all to authenticated
  using  (key in ('main','device','intl') and public.nvdx_is_admin())
  with check (key in ('main','device','intl') and public.nvdx_is_admin());

-- ── 3) consumables_report: 읽기 로그인자 / 쓰기 관리자 ──────────────────────
alter table public.consumables_report enable row level security;
drop policy if exists nvdx_cr_read  on public.consumables_report;
drop policy if exists nvdx_cr_write on public.consumables_report;
create policy nvdx_cr_read  on public.consumables_report for select to authenticated using (true);
create policy nvdx_cr_write on public.consumables_report for all to authenticated
  using (public.nvdx_is_admin()) with check (public.nvdx_is_admin());

-- ── 4) site_registry: 읽기 로그인자 / 쓰기 관리자 ───────────────────────────
--     이 테이블의 값이 런처·라우팅·권한 노출을 좌우하므로 쓰기를 잠근다.
alter table public.site_registry enable row level security;
drop policy if exists nvdx_sr_read  on public.site_registry;
drop policy if exists nvdx_sr_write on public.site_registry;
create policy nvdx_sr_read  on public.site_registry for select to authenticated using (true);
create policy nvdx_sr_write on public.site_registry for all to authenticated
  using (public.nvdx_is_admin()) with check (public.nvdx_is_admin());

-- ── 5) 로그인 전에 동작해야 하는 3가지 예외 ─────────────────────────────────

-- 5-1) 견적서 공개 링크(?q=견적번호) — 비로그인 조회 필요
--      ※ 이 예외를 없애면 공개 링크 공유 기능이 동작하지 않습니다.
drop policy if exists nvdx_quotes_public on public.quotes;
create policy nvdx_quotes_public on public.quotes for select to anon using (true);

-- 5-2) 오류 수집 — 로그인 전 발생한 에러도 받아야 하므로 anon INSERT 허용(읽기는 불가)
alter table public.site_errors enable row level security;
drop policy if exists nvdx_err_insert on public.site_errors;
drop policy if exists nvdx_err_read   on public.site_errors;
create policy nvdx_err_insert on public.site_errors for insert to anon, authenticated with check (true);
create policy nvdx_err_read   on public.site_errors for select to authenticated
  using (public.nvdx_is_admin());

-- 5-3) 가입 신청 — 로그인 화면의 신청 폼(비로그인)에서 INSERT 필요, 조회·승인은 관리자만
alter table public.signup_requests enable row level security;
drop policy if exists nvdx_signup_insert on public.signup_requests;
drop policy if exists nvdx_signup_admin  on public.signup_requests;
create policy nvdx_signup_insert on public.signup_requests for insert to anon, authenticated with check (true);
create policy nvdx_signup_admin  on public.signup_requests for all to authenticated
  using (public.nvdx_is_admin()) with check (public.nvdx_is_admin());

-- ── 5-4) 미사용 테이블 완전 잠금 ────────────────────────────────────────────
--   families·test_results·app_profiles·demo_sales·demo_customers 는 노바진단이
--   전혀 참조하지 않는데(코드 grep 0건) 비로그인 INSERT·UPDATE 가 실제로 통했다.
--   정책을 하나도 만들지 않으면 RLS 기본 거부 → anon·authenticated 모두 차단된다.
--   (관리자가 필요할 땐 Supabase 대시보드/서비스키로 접근 가능)
do $$
declare t text;
begin
  foreach t in array array['families','test_results','app_profiles','demo_sales','demo_customers'] loop
    if exists (select 1 from information_schema.tables
                where table_schema='public' and table_name=t) then
      execute format('alter table public.%I enable row level security', t);
      -- 기존 허용 정책 전부 제거(이 테이블들엔 남겨둘 이유가 없다)
      execute (
        select coalesce(string_agg(format('drop policy if exists %I on public.%I;', policyname, t), ' '), '')
        from pg_policies where schemaname='public' and tablename=t
      );
    end if;
  end loop;
end $$;

-- ── 6) 요청·신고함: 로그인자 등록, 관리자 조회 ──────────────────────────────
alter table public.site_feedback enable row level security;
drop policy if exists nvdx_fb_insert on public.site_feedback;
drop policy if exists nvdx_fb_admin  on public.site_feedback;
create policy nvdx_fb_insert on public.site_feedback for insert to authenticated with check (true);
create policy nvdx_fb_admin  on public.site_feedback for all to authenticated
  using (public.nvdx_is_admin()) with check (public.nvdx_is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  [검증] 실행 후 아래를 돌려 정책이 걸렸는지 확인
-- ═══════════════════════════════════════════════════════════════════════════
-- select tablename, policyname, roles, cmd
--   from pg_policies where schemaname='public' and policyname like 'nvdx_%'
--  order by tablename, policyname;


-- ═══════════════════════════════════════════════════════════════════════════
--  [ROLLBACK] 되돌리기 — 문제 생기면 이 블록만 실행
-- ═══════════════════════════════════════════════════════════════════════════
-- do $$
-- declare r record;
-- begin
--   for r in select schemaname, tablename, policyname from pg_policies
--             where schemaname='public' and policyname like 'nvdx_%'
--   loop
--     execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
--   end loop;
-- end $$;
-- drop function if exists public.nvdx_is_admin();
