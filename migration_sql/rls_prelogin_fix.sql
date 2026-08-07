-- ═══════════════════════════════════════════════════════════════════════════
--  RLS 회귀 수정 — 로그인 전/일반 사용자 쓰기 3종 복구
--
--  증상(실측):
--    signup_requests INSERT : anon 401 · user 403 · admin 201
--    site_errors     INSERT : anon 401 · user 403
--    site_feedback   INSERT : user 403
--    → 회원가입 신청 불가 / 자동 에러수집 불가 / 요청·신고 버튼 불가(9개 사이트)
--
--  원인: rls_lockdown_v2 의 "예외 정책" 3개(nvdx_su_ins·nvdx_err_ins·nvdx_fb_ins)가
--        실제 DB 에 존재하지 않는다. 관리자 전용 정책(FOR ALL)만 걸려 있어
--        admin 만 쓸 수 있는 상태. 이 스크립트는 그 3개만 다시 만든다.
--        (읽기는 그대로 관리자 전용 — 개인정보 노출 없음)
--
--  Supabase → SQL Editor 에 통째로 붙여넣고 Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0) 테이블 권한(정책과 별개) 보강 — 이미 있으면 무해 ─────────────────────
grant insert on public.signup_requests to anon, authenticated;
grant insert on public.site_errors     to anon, authenticated;
grant insert on public.site_feedback   to authenticated;

-- ── 1) 회원가입 신청: 비로그인도 접수 가능(로그인 전 기능이므로 필수) ───────
drop policy if exists nvdx_su_ins on public.signup_requests;
create policy nvdx_su_ins on public.signup_requests
  for insert to anon, authenticated
  with check (true);

-- ── 2) 자동 에러수집: 로그인 전 발생한 오류도 받아야 한다(읽기는 관리자만) ──
drop policy if exists nvdx_err_ins on public.site_errors;
create policy nvdx_err_ins on public.site_errors
  for insert to anon, authenticated
  with check (true);

-- ── 3) 요청·신고함: 로그인 사용자면 등록 가능(읽기는 관리자만) ──────────────
drop policy if exists nvdx_fb_ins on public.site_feedback;
create policy nvdx_fb_ins on public.site_feedback
  for insert to authenticated
  with check (true);

-- ── 4) 중복 가입신청 차단 ───────────────────────────────────────────────────
--     앱은 신청 전 같은 이메일의 pending 건을 SELECT 로 확인하는데,
--     비로그인은 조회가 막혀 있어(개인정보 보호) 그 검사가 항상 통과한다.
--     → 같은 이메일이 무한히 쌓이지 않도록 DB 레벨에서 막는다.
--     (앱은 23505 오류를 "이미 신청 접수됨" 안내로 변환해 표시)
create unique index if not exists nvdx_signup_pending_uniq
  on public.signup_requests (lower(email))
  where status = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════
--  [검증] 아래 결과를 붙여주세요 — 3개 테이블의 정책이 제대로 걸렸는지
-- ═══════════════════════════════════════════════════════════════════════════
select tablename, policyname, cmd, roles::text as 대상롤,
       coalesce(with_check::text,'-') as check_식
  from pg_policies
 where schemaname = 'public'
   and tablename in ('signup_requests','site_errors','site_feedback')
 order by tablename, cmd, policyname;


-- ═══════════════════════════════════════════════════════════════════════════
--  [ROLLBACK] 이 스크립트만 되돌리기 (다시 관리자 전용으로)
-- ═══════════════════════════════════════════════════════════════════════════
-- drop policy if exists nvdx_su_ins  on public.signup_requests;
-- drop policy if exists nvdx_err_ins on public.site_errors;
-- drop policy if exists nvdx_fb_ins  on public.site_feedback;
-- drop index if exists public.nvdx_signup_pending_uniq;
