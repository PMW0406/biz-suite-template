-- ═══════════════════════════════════════════════════════════════════════════
--  demo_schedules 테이블 구조 교정 + 데모 일정 시드
--
--  문제: 이 테이블이 (id, data jsonb, updated_at) 로 만들어져 있는데,
--        코드(kor.html `_loadDemoSched`, total.html 운영현황)는 평면 컬럼
--        (date, cust, sales, product, status …)을 읽는다. → 항상 빈 목록.
--
--  이 스크립트는 컬럼을 코드가 기대하는 형태로 맞추고, 데모 일정을 넣는다.
--  ※ 현재 이 테이블은 0행이므로 데이터 손실 없음.
--
--  Supabase → SQL Editor 에 통째로 붙여넣고 Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) 컬럼 교정 (없으면 추가) ──────────────────────────────────────────────
alter table public.demo_schedules add column if not exists date       date;
alter table public.demo_schedules add column if not exists end_date   date;
alter table public.demo_schedules add column if not exists "time"     text;
alter table public.demo_schedules add column if not exists cust       text;
alter table public.demo_schedules add column if not exists sales      text;
alter table public.demo_schedules add column if not exists product    text;
alter table public.demo_schedules add column if not exists content    text;
alter table public.demo_schedules add column if not exists outcome    text;
alter table public.demo_schedules add column if not exists status     text;
alter table public.demo_schedules add column if not exists result     text;
-- 기존 jsonb 컬럼은 쓰지 않지만 남겨둔다(다른 코드가 참조할 경우 대비)
alter table public.demo_schedules alter column data drop not null;

-- ── 2) 데모 일정 시드 (2026-08-07 ~ 08-21) ─────────────────────────────────
delete from public.demo_schedules where id like 'ds_%';
insert into public.demo_schedules (id, date, "time", cust, sales, product, content, status, result, outcome) values
 ('ds_01','2026-08-07','10:00','목동진단랩4',   '강민재','생화학 분석기 C-300',   '신규 도입 데모 · 검체 처리량 시연',      'done','긍정','장비 성능 만족, 견적 요청'),
 ('ds_02','2026-08-07','14:30','서울진단랩3',   '윤채원','면역형광 분석기 IF-100','기존 장비 대체 검토 데모',              'done','보통','예산 일정 확인 후 재연락'),
 ('ds_03','2026-08-10','09:30','광주진단랩58',  '임태양','바이오PCR 분석기 P-200','신규 거래처 첫 데모',                   '',    '',''),
 ('ds_04','2026-08-11','11:00','대전진단랩22',  '한소율','생화학 분석기 C-300',   '증설 검토 · 2호기 데모',                '',    '',''),
 ('ds_05','2026-08-12','15:00','성남진단랩23',  '강민재','면역형광 분석기 IF-100','경쟁사 비교 데모 요청',                 '',    '',''),
 ('ds_06','2026-08-13','10:30','수원진단랩25',  '윤채원','바이오PCR 분석기 P-200','시약 연동 테스트 포함 데모',            '',    '',''),
 ('ds_07','2026-08-14','13:00','일산진단랩14',  '임태양','생화학 분석기 C-300',   '원장 직접 참관 데모',                   '',    '',''),
 ('ds_08','2026-08-17','09:00','일산바이오랩5', '한소율','면역형광 분석기 IF-100','랩 자동화 라인 연계 데모',              '',    '',''),
 ('ds_09','2026-08-18','14:00','광주바이오랩13','강민재','바이오PCR 분석기 P-200','검사 항목 확대 검토 데모',              '',    '',''),
 ('ds_10','2026-08-19','11:30','평촌바이오랩30','윤채원','생화학 분석기 C-300',   '리스 만료 대체 데모',                   '',    '',''),
 ('ds_11','2026-08-20','10:00','대구동물메디컬8','임태양','면역형광 분석기 IF-100','수의 진단 패널 데모',                  '',    '',''),
 ('ds_12','2026-08-21','15:30','수원진단랩32',  '한소율','바이오PCR 분석기 P-200','2차 데모 · 실검체 비교',                '',    '','');

-- ── 3) 검증 ────────────────────────────────────────────────────────────────
select count(*) as 총건수,
       count(*) filter (where date >= current_date) as 예정건수,
       min(date) as 최초, max(date) as 최종
  from public.demo_schedules;
