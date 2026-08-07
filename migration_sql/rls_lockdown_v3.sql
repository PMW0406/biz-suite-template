-- ═══════════════════════════════════════════════════════════════════════════
--  노바진단(novadx) RLS 정밀화 v3   ★ v2 실행 후 이것을 실행 ★
--
--  v2 의 구멍: site_registry · cons_cache 는 UPDATE(수정)만 관리자로 막고
--  DELETE(삭제)는 로그인 사용자 전체에 열려 있었다.
--    · site_registry 행 삭제 → 런처에서 사이트 사라짐 + 라우팅 파손
--    · cons_cache main/device 삭제 → 전 사이트 매출 빈 화면
--
--  이 스크립트는 그 두 테이블의 삭제만 관리자로 좁힌다.
--  나머지 업무 테이블(quotes·customers·pipeline 등)의 삭제는
--  사내 공유 CRM 의 정상 업무이므로 건드리지 않는다.
--
--  Supabase → SQL Editor 에 붙여넣고 Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── site_registry: 읽기 로그인자 / 수정·삭제·삽입 모두 관리자 ───────────────
--    (v2 의 nvdx_sr_write 는 FOR ALL 이지만 DELETE 를 확실히 포함시키기 위해
--     정책을 재정의한다. FOR ALL = SELECT/INSERT/UPDATE/DELETE 전부.)
drop policy if exists nvdx_sr_write on public.site_registry;
create policy nvdx_sr_write on public.site_registry
  for all to authenticated
  using      (public.nvdx_is_admin())
  with check (public.nvdx_is_admin());

-- ── cons_cache: DELETE 를 관리자 전용으로(회계 원본 3키 보호와 동일 기조) ────
--    v2 의 nvdx_cc_del 는 이미 관리자 전용이지만, 명시적으로 재보증한다.
drop policy if exists nvdx_cc_del on public.cons_cache;
create policy nvdx_cc_del on public.cons_cache
  for delete to authenticated
  using (public.nvdx_is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
--  [검증] 아래 실행 결과를 붙여주세요 — site_registry·cons_cache 정책 확인
-- ═══════════════════════════════════════════════════════════════════════════
select tablename, policyname, cmd, roles, qual as using_식, with_check as check_식
  from pg_policies
 where schemaname = 'public'
   and tablename in ('site_registry','cons_cache')
 order by tablename, cmd, policyname;


-- ═══════════════════════════════════════════════════════════════════════════
--  [ROLLBACK] 이 스크립트만 되돌리기(v2 상태로) — 두 테이블 삭제를 다시 로그인자에게
-- ═══════════════════════════════════════════════════════════════════════════
-- drop policy if exists nvdx_sr_write on public.site_registry;
-- create policy nvdx_sr_write on public.site_registry for all to authenticated
--   using (public.nvdx_is_admin()) with check (public.nvdx_is_admin());
--   -- (참고: v2 원본과 동일. site_registry 는 v2 에서도 FOR ALL 관리자였음)
