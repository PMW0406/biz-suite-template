# PORT_GUIDE — 실제 사이트를 데모 템플릿으로 이식하는 지시서

> **목적**: 원텍(wt-management) 실제 사이트들의 완성도 높은 UI/기능을 그대로 가져오되,
> **회사 데이터·접속키·브랜딩만 가짜/가상으로 교체**해서 개인 포트폴리오 데모로 만든다.
> 이직 준비용. 회사 영업비밀 데이터는 절대 넣지 않는다(임의 데이터만).

## 새 대화창에서 시작하는 법
> "biz-suite-template 저장소의 PORT_GUIDE.md 대로 **전사종합(total.html)부터** 순차 이식해줘"
라고 지시하면 된다. 한 번에 하나씩 완성 → 검증 → 다음.

---

## 0) 대상·인프라

- **원본 위치**: `C:/Users/user/Documents/wt-sites/<repo>/` (없으면 `gh repo clone wt-management/<repo>`)
- **이식 대상 저장소**: `PMW0406/biz-suite-template` (개인, public, GitHub Pages 켜짐)
  - 라이브: https://pmw0406.github.io/biz-suite-template/
- **새 Supabase(데모 전용)**: `https://bdkurlqmfsswgeiujyev.supabase.co`
  - anon key: `sb_publishable_pOXTPRPFUESBxgXBAo9mBg_zaW5jID3`
  - service_role key: 로컬 파일 `C:/Users/user/Desktop/메모장.txt` (1줄, 출력·커밋 금지)
- **회사 Supabase(절대 손대지 말 것)**: `mhfacbsittfdkknwybhc` — 원본 파일에 이 값이 박혀 있으니 **전부 새 프로젝트로 치환**이 최우선.

## 이식 우선순위 (완성도·화려함 순)
1. `wontech/total.html` — 전사 종합 경영 대시보드 (임원리포트·차트·KPI)
2. `wt-corps/us.html`, `th.html` — 미국·태국 법인 ERP
3. `wt-receivables/index.html` — 미수금 관리
4. `wt-consumables/ilbo.html` + `index.html` — 소모품 일일보고
5. `wontech/index.html` — 한국영업 CRM ⚠️ **2.2MB, 실제 매출 상수(CONS/DEVICE) 박혀있음 — 반드시 값 가짜화 후에만**

---

## 1) 파일별 공통 이식 절차 (매 파일 반복)

### (a) 파일 복사 + 접속키 교체 [필수·최우선]
원본 HTML을 biz-suite-template로 복사 후, **회사 Supabase 접속 정보를 새 프로젝트로 치환**:
- `mhfacbsittfdkknwybhc.supabase.co` → `bdkurlqmfsswgeiujyev.supabase.co`
- 회사 anon key `sb_publishable_aPMOOWAlyJlMcP1ZM_gpPA_jlrcvCRd` → `sb_publishable_pOXTPRPFUESBxgXBAo9mBg_zaW5jID3`
> ⚠️ 이 치환을 빠뜨리면 개인 공개페이지가 회사 DB에 접속하게 됨 = 심각한 유출. **가장 먼저 확인.**

### (b) 브랜딩·CI 제거 → 가상회사명
- 회사명: `원텍`/`Wontech`/`WONTECH`/`wontech` → 가상회사명 **`샘플메디`(SampleMedi)** 로 통일 (실존 회사명 금지 — 바이오노트 등 X)
- CI 로고: `data:image/png;base64,iVBORw0KGgoA...` (헤더/파비콘의 원텍 PNG 로고) → 제거하거나 단순 텍스트/이모지 로고로 대체
- 도메인 참조 `wt-management.github.io/<repo>/...` → 데모에선 사이트 간 이동 없으면 제거, 필요하면 `pmw0406.github.io/biz-suite-template/...`
- 제품명(실제 상품): `Oligio Tip [F-4.0]`, `올리지오`, `BA400/BA600` 계열, `헤어빔`, `Cartridge` → 가상 제품명 `제품 A/B/C`, `소모품 X` 등으로 치환

### (c) 그 사이트가 읽는 Supabase 데이터 → 가짜로 시드
각 파일이 `_sb.from('<table>')` 로 읽는 테이블을 파악(`grep -oE "_sb\.from\('[^']+'\)"`), 새 프로젝트에 **테이블 생성(SQL)** + **가짜 데이터 주입(service key)**.
> 테이블 DDL은 사용자가 Supabase SQL Editor에서 실행해야 함(스크립트로 DDL 불가). SQL을 만들어 사용자에게 실행 요청 → 실행 후 seed.

### (d) node --check + 배포 + 라이브 검증
- 인라인 `<script>` 추출 → `node --check` (문법)
- `git add/commit/push` (user.name=PMW0406, email=pmw0406@gmail.com)
- Pages 빌드 대기(`gh api repos/PMW0406/biz-suite-template/pages/builds/latest`) 후 `curl` + 프리뷰로 렌더 검증

---

## 2) 재구성한 실제 스키마 (새 프로젝트에 생성) — `sql/real_schema.sql` 참조

원본이 쓰는 핵심 테이블(초기 대시보드에서 직접 만들어 migration_sql에 정의 없음 → 코드에서 재구성):

- **crm_profiles**: `id uuid PK (auth.users), email, display_name, dept, position, role('user|manager|admin'), access(콤마 site key), upload, temp_pw`
  - 원본은 `crm_profiles`, 내가 만든 골격 템플릿은 `app_profiles` → **원본 파일에 맞춰 crm_profiles로 통일**
- **cons_cache**: `key text PK, data jsonb, updated_at` — 집계 캐시(key별 큰 JSON blob)
- 그 외 migration_sql 재사용: `site_registry, dept_perms, sales_targets, pending_sales, export_tower, site_feedback, site_errors, targets, logs, quotes` 등 (해당 사이트가 읽는 것만)

### cons_cache 키별 JSON 구조 (가짜 생성 시 이 shape 유지)
- **`main`**: `{updatedAt, monthly2025{1..12}, monthly2026{1..12}, products2025{제품:금액}, products2026{}, groups2026{}, qtr2025{1분기..4분기}, qtr2026{}, oligioMo2025{}, oligioMo2026{}, hospitals[{name,amount,...}]}`
  - ⚠️ 실제 shape은 `wontech/index.html`의 `const CONS = {...}`(4232행 부근)에 그대로 있음 — **구조만 복사, 모든 숫자는 랜덤/가짜로, 제품명은 가상으로 치환**
- **`device`**: 장비 데이터 — `wontech/index.html`의 `const DEVICE = {...}` shape 참고, 값 가짜화
- **`intl`**: 해외 집계 — 원본 intl 로직이 파싱하는 shape (국가별·제품별). total.html/intl 코드에서 파싱부 확인
- **`export_tower`**: 수출의 탑 진행현황 (migration `step_export_tower.sql` 참고)
- **`region_map`, `sales_targets`, `ilbo_pending`**: 각 파싱부 확인 후 최소 shape로 가짜 생성

> **팁**: cons_cache 가짜 blob은 index.html 임베디드 상수(CONS/DEVICE)의 **키 구조를 그대로 두고 값만 randomize + 제품명 치환**하면 shape가 100% 맞는다. 이게 가장 확실.

---

## 3) 가짜 사용자(데모 로그인) — `sql/seed.js` 방식 재사용
service key로 Auth Admin API 사용해 데모 계정 생성 + crm_profiles 채움:
- admin@demo.local (admin, 전체 access) / manager@demo.local / user@demo.local — 비번 `demo1234`
- 부서·직급·담당자명도 가짜(한국 이름 랜덤). 거래처·매출도 가짜.

---

## 4) 안전 체크리스트 (매 커밋 전)
- [ ] 회사 Supabase URL/key가 파일에 **하나도** 안 남아있나 (`grep mhfacbsittfdkknwybhc`, 회사 anon key grep → 0건)
- [ ] 실제 매출 수치·실제 병원명·실제 직원명 없나 (CONS/DEVICE 값 가짜화 확인)
- [ ] 원텍 CI base64 로고 제거됐나 / 회사명 `원텍`류 0건 (`grep -c "원텍\|Wontech"`)
- [ ] 실존 회사명(바이오노트 등) 안 썼나 — 가상회사명만
- [ ] `node --check` 통과

---

## 진행 현황 (이식 완료 표시) — 전부 완료 2026-07-23
- [x] total.html (전사 종합) — 샘플메디, 9개 페이지 렌더 확인
- [x] wt-corps us.html / th.html — 법인 ERP(USD/THB), 실미국병원468·직원이메일·실제품 가짜화
- [x] wt-receivables (receivables.html) — 미수금 42건, 성격별분류·담당자별·주간추이
- [x] wt-consumables ilbo.html / index.html — 원텍몰→샘플몰, oligio/womall 키 rename
- [x] wontech index.html → kor.html (한국영업) — 임베디드 CONS/DEVICE 상수 구조보존·값스크램블(병원902/768·제품·대리점 가짜)

라이브(전부 로그인 admin@demo.local / demo1234):
- total.html · us.html · th.html · receivables.html · ilbo.html · consumables.html · kor.html
- 신규 테이블: site_registry, consumables_report, quotes/customers/equipments/products/pipeline, logs
- 시드: sql/seed_total.js · seed_corps.js · seed_receivables.js · seed_consumables.js · seed_kor.js
