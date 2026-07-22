# Biz Suite Template

사내 다중 사이트 관리 시스템의 **재사용 가능한 뼈대(템플릿)**.
로그인 · 권한 시스템 · 사이트 런처 · 요청/신고 위젯 · 관리자 콘솔을 갖춘 정적 웹앱 + Supabase 백엔드.

> ⚠️ 이 저장소에는 **실제 회사 데이터가 전혀 없습니다.** 모든 값은 예시/가짜 데이터이며,
> 어느 조직에나 재사용할 수 있도록 브랜딩·업무로직을 일반화했습니다.

## 구성

| 영역 | 내용 |
|------|------|
| **인증** | Supabase Auth (이메일+비밀번호). 본인 비밀번호 변경 / 관리자 임시비번 발급 |
| **권한** | `app_profiles.access` = 접근 가능한 site key 목록. `role` = user/manager/admin |
| **런처** | 로그인 후 권한 있는 사이트만 카드로 표시 (site_registry 기반) |
| **사이트 레지스트리** | 사이트 추가 = DB row 1개 INSERT → 런처·권한매트릭스·라우팅 자동 반영 |
| **관리자 콘솔** | 사용자 CRUD, 권한 매트릭스, 부서 기본권한, 요청·신고함 조회 |
| **요청·신고 위젯** | 전 페이지 공통. 사용자 오류 자동수집 + 직원 요청 접수 |

## 데모 사이트 3종 (업종별 대표 유형)

1. `index.html` — **CRM형**: 거래처 목록·파이프라인 (영업관리 스타일)
2. `dashboard.html` — **대시보드형**: 매출 KPI·지역별 차트 (경영 종합 스타일)
3. `upload.html` — **업로드/보고형**: 엑셀 업로드 → 표·그래프 (일일보고 스타일)

## 새 조직에 세팅하는 법

1. **Supabase 프로젝트 생성** (무료) → Project URL / anon key / service_role key 확보
2. `sql/schema.sql` 을 SQL Editor에서 실행 (테이블·RLS·레지스트리 시드)
3. `sql/seed.js` 실행 (service_role 키로 가짜 사용자·거래처·매출 주입) — 데모 로그인 계정 생성
4. `config.js` 의 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 를 새 프로젝트 값으로 교체
5. GitHub Pages 로 배포 (Settings → Pages → main branch)
6. 업종에 맞게: 색상·메뉴·`demo_*` 테이블·페이지 업무로직 교체

## 데모 로그인 (seed 실행 후)

| 계정 | 역할 | 권한 |
|------|------|------|
| admin@demo.local | 관리자 | 전체 |
| manager@demo.local | 팀장 | crm, dashboard |
| user@demo.local | 팀원 | crm |

비밀번호는 seed 스크립트 출력 참고.
