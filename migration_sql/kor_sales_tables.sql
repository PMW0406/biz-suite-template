-- ─────────────────────────────────────────────────────────────
--  국내영업 매출현황(kor-sales.html) 전용 테이블
--  Supabase → SQL Editor 에 통째로 붙여넣고 Run
-- ─────────────────────────────────────────────────────────────

-- 1) 계약 원장
create table if not exists public.kor_contracts (
  id         bigserial primary key,
  no         integer,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
create index if not exists kor_contracts_no_idx on public.kor_contracts(no);

-- 2) 메시지(계약별 코멘트 + 전체 게시판)
create table if not exists public.kor_messages (
  id         bigserial primary key,
  scope      text not null,          -- 'board' 또는 'c:<계약번호>'
  author     text,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists kor_messages_scope_idx on public.kor_messages(scope, created_at desc);

-- 3) RLS: 로그인 사용자만 읽기/쓰기 (익명 차단)
alter table public.kor_contracts enable row level security;
alter table public.kor_messages  enable row level security;

drop policy if exists kor_contracts_auth on public.kor_contracts;
create policy kor_contracts_auth on public.kor_contracts
  for all to authenticated using (true) with check (true);

drop policy if exists kor_messages_auth on public.kor_messages;
create policy kor_messages_auth on public.kor_messages
  for all to authenticated using (true) with check (true);

-- 익명(anon)에는 어떤 정책도 부여하지 않음 → RLS 기본 거부
