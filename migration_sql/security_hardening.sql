-- ============================================================================
-- 노바진단 데모 — 보안 하드닝  (Supabase 대시보드 → SQL Editor 에서 실행)
--
-- 배경: RLS가 "인증된 사용자면 무엇이든 쓰기 허용(check(true))" 상태라,
--       계정만 있으면 (1) crm_profiles로 관리자 권한 상승 + 남의 temp_pw/이메일 읽기,
--       (2) site_registry에 악성 데이터 주입이 가능. 아래로 차단한다.
--
-- ★ 가장 중요(이거 먼저): Authentication → Sign In / Providers →
--   "Allow new users to sign up" 를 끈다. 그러면 통제된 계정만 남아 위험이 소멸.
--   아래 SQL은 그 위에 얹는 심층방어(defense-in-depth).
--
-- 주의: 기존 정책 이름이 다르면 아래 DROP이 안 지워질 수 있음.
--       실행 후 대시보드 Authentication → Policies 에서 각 테이블에
--       "authenticated ... true" 같은 과대허용 정책이 남아있지 않은지 확인.
-- ============================================================================

-- 0) 관리자 판정 헬퍼 (security definer → RLS 재귀 회피)
create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from crm_profiles where id = auth.uid() and role = 'admin');
$$;

-- 1) crm_profiles ─ 본인 행만 읽기(+관리자), 권한(role/access) 자가상승 차단
alter table crm_profiles enable row level security;
drop policy if exists crm_profiles_all_auth   on crm_profiles;
drop policy if exists crm_profiles_write_auth  on crm_profiles;
drop policy if exists crm_profiles_auth_all    on crm_profiles;
drop policy if exists crm_profiles_select      on crm_profiles;
drop policy if exists crm_profiles_update_self on crm_profiles;
drop policy if exists crm_profiles_admin_all   on crm_profiles;

create policy crm_profiles_select on crm_profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy crm_profiles_update_self on crm_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy crm_profiles_admin_all on crm_profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- role/access/upload 컬럼은 관리자만 변경 (비관리자 자가상승 차단)
create or replace function public.prevent_priv_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.role   is distinct from old.role
    or new.access is distinct from old.access
    or new.upload is distinct from old.upload then
      raise exception '권한(role/access) 변경 권한이 없습니다';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_prevent_priv on crm_profiles;
create trigger trg_prevent_priv before update on crm_profiles
  for each row execute function public.prevent_priv_escalation();

-- 2) site_registry ─ 쓰기는 관리자 전용 (읽기는 런처용으로 유지)
alter table site_registry enable row level security;
drop policy if exists site_registry_write_auth   on site_registry;
drop policy if exists site_registry_all_auth      on site_registry;
drop policy if exists site_registry_admin_write   on site_registry;
drop policy if exists site_registry_read          on site_registry;

create policy site_registry_admin_write on site_registry for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy site_registry_read on site_registry for select to authenticated using (true);

-- 3) (선택) 업무 테이블 쓰기를 통제계정만 하도록 더 죄고 싶으면,
--    각 테이블(cons_cache/logs/pipeline/customers/quotes/products/equipments/
--    pending_sales/consumables_report/corp_us_erp 등)의 write 정책 with check 를
--    public.is_admin() 또는 특정 이메일 화이트리스트로 바꾼다.
--    단, "방문자가 직접 편집해보는" 데모 체험을 유지하려면 가입만 꺼도 충분.
