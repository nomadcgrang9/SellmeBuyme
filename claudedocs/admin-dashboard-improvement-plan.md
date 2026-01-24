# 관리자 대시보드 개선 계획

## ✅ 구현 완료

### 수정된 파일

1. **`supabase/functions/dashboard-analytics/index.ts`** (신규 생성)
   - SERVICE_ROLE_KEY를 사용하여 RLS 우회
   - user_activity_logs 테이블에서 실제 데이터 조회
   - DAU/WAU/MAU, 재방문율, 트래픽 추이, 디바이스/지역 분포 계산

2. **`src/lib/supabase/queries.ts`** (수정)
   - `fetchDashboardAnalytics()` 함수를 Edge Function 호출 방식으로 변경
   - 기존 직접 DB 조회 → Edge Function 호출

### 배포 방법

```bash
# Edge Function 배포
supabase functions deploy dashboard-analytics

# 환경변수 확인 (이미 설정되어 있어야 함)
# SUPABASE_SERVICE_ROLE_KEY 또는 SERVICE_ROLE_KEY
```

---

## 현재 상태 분석

### ✅ 이미 구현된 기능

1. **활동 로깅 시스템**
   - `user_activity_logs` 테이블 (마이그레이션 완료)
   - `useActivityTracking` 훅 → App.tsx에서 사용 중
   - 세션 ID 기반 방문자 추적
   - 디바이스 타입, 지역, 페이지 경로 메타데이터 수집

2. **대시보드 쿼리**
   - `fetchDashboardAnalytics()` 함수 → 실제 DB 조회
   - DAU/WAU/MAU 계산 로직 구현
   - 재방문율 계산 구현
   - 일일 트래픽 추이 구현

3. **대시보드 UI 컴포넌트**
   - `DashboardOverview.tsx` → 데이터 연동 완료
   - 핵심 KPI 카드 (DAU, WAU, MAU, 재방문율)
   - 일일 방문자 추이 차트
   - 시간대별 방문 분포
   - 디바이스 분포
   - 지역별 접속 현황

### ❓ 확인 필요 사항

1. **RLS 정책 문제 가능성**
   - `user_activity_logs` 테이블의 SELECT 권한이 `service_role` 전용
   - 프론트엔드에서 `anon` 키로 조회하면 빈 배열 반환

2. **데이터 수집 확인**
   - 실제로 `user_activity_logs`에 데이터가 쌓이고 있는지 확인 필요

---

## 문제 진단

### 가설 1: RLS 정책으로 인한 조회 실패

현재 RLS 정책:
```sql
-- 조회는 service_role만 (대시보드용)
CREATE POLICY "Service role read" ON user_activity_logs
  FOR SELECT USING (auth.role() = 'service_role');
```

**문제**: 프론트엔드는 `anon` 또는 `authenticated` 역할 사용
→ `fetchDashboardAnalytics()`가 빈 배열 반환

### 해결 방안

**옵션 A: Edge Function 사용 (권장)**
- 새 Edge Function `dashboard-analytics` 생성
- `SERVICE_ROLE_KEY`로 DB 조회
- 프론트엔드에서 Edge Function 호출

**옵션 B: RLS 정책 수정**
- 관리자 역할에게 SELECT 권한 부여
- 보안 취약점 가능성 있음

---

## 구현 계획

### Phase 1: Edge Function 생성 (핵심)

**파일**: `supabase/functions/dashboard-analytics/index.ts`

```typescript
// Edge Function으로 대시보드 데이터 조회
// SERVICE_ROLE_KEY 사용하여 RLS 우회
// 관리자 인증 체크 포함
```

### Phase 2: 프론트엔드 수정

**파일**: `src/lib/supabase/queries.ts`

```typescript
// fetchDashboardAnalytics() 수정
// Edge Function 호출로 변경
```

### Phase 3: 추가 기능 (선택)

1. **실시간 데이터 갱신**
   - Supabase Realtime 구독
   - 새 방문자 실시간 반영

2. **상세 분석 추가**
   - 인기 페이지 순위
   - 검색 키워드 통계
   - 사용자 행동 흐름 분석

---

## 수정할 파일 목록

| 파일 | 작업 |
|------|------|
| `supabase/functions/dashboard-analytics/index.ts` | 신규 생성 |
| `src/lib/supabase/queries.ts` | Edge Function 호출로 수정 |
| `src/components/admin/dashboard/DashboardOverview.tsx` | 에러 핸들링 개선 (선택) |

---

## 검증 방법

1. **데이터 수집 확인**
   ```sql
   SELECT COUNT(*) FROM user_activity_logs;
   SELECT * FROM user_activity_logs LIMIT 10;
   ```

2. **Edge Function 테스트**
   ```bash
   supabase functions invoke dashboard-analytics
   ```

3. **대시보드 확인**
   - https://sellmebuyme.pages.dev/sellba-x7k9m2-team-console-2025
   - KPI 카드에 실제 숫자 표시 확인
   - 차트에 데이터 반영 확인

---

## 예상 결과

개선 후 대시보드에서 확인 가능한 지표:

- **DAU**: 오늘 방문한 고유 사용자 수
- **WAU**: 최근 7일 방문한 고유 사용자 수
- **MAU**: 최근 30일 방문한 고유 사용자 수
- **재방문율**: 7일 내 2회 이상 방문한 비율
- **일일 추이**: 최근 7일간 방문자 변화
- **시간대별**: 가장 활발한 시간대
- **디바이스**: 모바일/데스크톱 비율
- **지역별**: 접속 지역 분포
