-- ═══════════════════════════════════════════════════════════════════════════
--  노바진단(novadx) RLS 잠금 v2  ★ v1 실행 후 이것을 반드시 실행 ★
--
--  v1의 결함: 새 정책만 추가하고 기존 정책을 지우지 않았다.
--  PostgreSQL RLS 정책은 OR 로 합쳐지므로, 기존 '전체 허용' 정책이 하나라도
--  남아 있으면 새 정책과 무관하게 비로그인 접근이 계속 통과한다.
--  → 대상 테이블의 정책을 '전부 삭제'한 뒤 필요한 것만 다시 만든다.
--
--  Supabase → SQL Editor 에 통째로 붙여넣고 Run.
--  ※ families · test_results (초등 학습앱)는 건드리지 않는다.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0) 관리자 판정 헬퍼(이미 있으면 갱신) ───────────────────────────────────
create or replace function public.nvdx_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crm_profiles p
                  where p.id = auth.uid() and p.role = 'admin');
$$;

-- ── 1) 대상 테이블의 기존 정책 전부 제거 + RLS 활성화 ───────────────────────
do $$
declare t text; r record;
begin
  foreach t in array array[
    'crm_profiles','customers','quotes','products','pipeline','logs','targets',
    'equipments','pending_sales','sales_targets','demo_schedules','dept_perms',
    'cons_cache','consumables_report','site_registry','site_errors',
    'signup_requests','site_feedback','app_profiles','demo_sales','demo_customers'
  ] loop
    if exists (select 1 from information_schema.tables
                where table_schema='public' and table_name=t) then
      execute format('alter table public.%I enable row level security', t);
      for r in select policyname from pg_policies
                where schemaname='public' and tablename=t loop
        execute format('drop policy if exists %I on public.%I', r.policyname, t);
      end loop;
    end if;
  end loop;
end $$;

-- ── 2) 업무 테이블: 로그인 사용자만 ─────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'crm_profiles','customers','products','pipeline','logs','targets',
    'equipments','pending_sales','sales_targets','demo_schedules','dept_perms'
  ] loop
    if exists (select 1 from information_schema.tables
                where table_schema='public' and table_name=t) then
      execute format(
        'create policy nvdx_auth_all on public.%I for all to authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;

-- ── 3) quotes: 로그인자 전체 + 공개 견적 링크(?q=)용 anon 읽기 ──────────────
create policy nvdx_q_auth   on public.quotes for all    to authenticated using (true) with check (true);
create policy nvdx_q_public on public.quotes for select to anon using (true);

-- ── 4) cons_cache: 읽기 로그인자 / 회계원본 3키는 관리자만 쓰기 ─────────────
create policy nvdx_cc_read on public.cons_cache for select to authenticated using (true);
create policy nvdx_cc_ins  on public.cons_cache for insert to authenticated
  with check (key not in ('main','device','intl') or public.nvdx_is_admin());
create policy nvdx_cc_upd  on public.cons_cache for update to authenticated
  using      (key not in ('main','device','intl') or public.nvdx_is_admin())
  with check (key not in ('main','device','intl') or public.nvdx_is_admin());
create policy nvdx_cc_del  on public.cons_cache for delete to authenticated
  using (public.nvdx_is_admin());

-- ── 5) consumables_report · site_registry: 읽기 로그인자 / 쓰기 관리자 ──────
create policy nvdx_cr_read  on public.consumables_report for select to authenticated using (true);
create policy nvdx_cr_write on public.consumables_report for all to authenticated
  using (public.nvdx_is_admin()) with check (public.nvdx_is_admin());

create policy nvdx_sr_read  on public.site_registry for select to authenticated using (true);
create policy nvdx_sr_write on public.site_registry for all to authenticated
  using (public.nvdx_is_admin()) with check (public.nvdx_is_admin());

-- ── 6) 로그인 전 필수 예외 2가지: 오류수집 · 가입신청 (쓰기만) ──────────────
create policy nvdx_err_ins  on public.site_errors for insert to anon, authenticated with check (true);
create policy nvdx_err_read on public.site_errors for select to authenticated using (public.nvdx_is_admin());

create policy nvdx_su_ins   on public.signup_requests for insert to anon, authenticated with check (true);
create policy nvdx_su_admin on public.signup_requests for all to authenticated
  using (public.nvdx_is_admin()) with check (public.nvdx_is_admin());

-- ── 7) 요청·신고함 ─────────────────────────────────────────────────────────
create policy nvdx_fb_ins   on public.site_feedback for insert to authenticated with check (true);
create policy nvdx_fb_admin on public.site_feedback for all to authenticated
  using (public.nvdx_is_admin()) with check (public.nvdx_is_admin());

-- ── 8) 미사용 잔여 테이블: 정책 없음 = 전면 차단(1단계에서 이미 삭제됨) ─────
--     app_profiles · demo_sales · demo_customers — 추가 정책을 만들지 않는다.


-- ═══════════════════════════════════════════════════════════════════════════
--  [검증] 아래를 실행해 결과를 그대로 붙여주세요
-- ═══════════════════════════════════════════════════════════════════════════
select tablename,
       count(*)                                              as 정책수,
       count(*) filter (where 'anon' = any(roles))           as anon정책,
       string_agg(policyname || '(' || cmd || ')', ', ' order by policyname) as 정책목록
  from pg_policies
 where schemaname = 'public'
   and tablename in ('crm_profiles','customers','quotes','products','pipeline','logs','targets',
                     'equipments','pending_sales','sales_targets','demo_schedules','dept_perms',
                     'cons_cache','consumables_report','site_registry','site_errors',
                     'signup_requests','site_feedback','app_profiles','demo_sales','demo_customers',
                     'families','test_results')
 group by tablename
 order by tablename;


-- ═══════════════════════════════════════════════════════════════════════════
--  [ROLLBACK] 되돌리기 — 잠금 전체 해제(모든 테이블 다시 열림)
-- ═══════════════════════════════════════════════════════════════════════════
-- do $$
-- declare r record;
-- begin
--   for r in select tablename, policyname from pg_policies
--             where schemaname='public' and policyname like 'nvdx_%' loop
--     execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
--   end loop;
--   for r in select unnest(array['crm_profiles','customers','quotes','products','pipeline','logs',
--            'targets','equipments','pending_sales','sales_targets','demo_schedules','dept_perms',
--            'cons_cache','consumables_report','site_registry','site_errors','signup_requests',
--            'site_feedback','app_profiles','demo_sales','demo_customers']) as t loop
--     execute format('alter table public.%I disable row level security', r.t);
--   end loop;
-- end $$;
