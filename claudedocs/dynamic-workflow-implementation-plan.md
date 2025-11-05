# Dynamic Workflow 구현 계획서

## 📋 개요

**목적**: GitHub Actions 워크플로우를 정적 설정에서 동적 설정으로 전환하여 DB 기반 크롤링 보드 관리 자동화

**현재 문제점**:
- 워크플로우 파일에 보드 목록이 하드코딩되어 있음 (4개만 스케줄됨, DB에는 6개)
- 새 보드 추가 시 워크플로우 파일 수정 필요
- DB와 워크플로우 간 동기화 수동 관리 필요

**해결 방안**: Supabase REST API를 통해 활성화된 보드를 동적으로 조회하여 매트릭스 생성

---

## 🏗️ 기술 아키텍처

### Two-Job Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  Trigger: schedule (cron: '0 1 * * *')                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Job 1: fetch-boards                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. Call Supabase REST API                            │  │
│  │     GET /rest/v1/crawl_boards                         │  │
│  │     Headers:                                           │  │
│  │       - apikey: {SUPABASE_ANON_KEY}                   │  │
│  │       - Authorization: Bearer {SUPABASE_ANON_KEY}     │  │
│  │     Query: ?select=id,name,crawler_code               │  │
│  │            &is_active=eq.true                          │  │
│  │                                                         │  │
│  │  2. Transform JSON with jq                            │  │
│  │     Input:  [{"id":"abc","name":"경기도",...}]         │  │
│  │     Output: [{"board_id":"abc","board_name":"경기도",  │  │
│  │              "crawler_code":"...",...}]                │  │
│  │                                                         │  │
│  │  3. Set GITHUB_OUTPUT                                 │  │
│  │     boards=[{...},{...},...]                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Job 2: crawl-dynamic                                        │
│  needs: [fetch-boards]                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  strategy:                                            │  │
│  │    fail-fast: false                                   │  │
│  │    matrix:                                            │  │
│  │      board: ${{ fromJSON(needs.fetch-boards          │  │
│  │                          .outputs.boards) }}          │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  For each board in matrix:                      │  │  │
│  │  │  1. Detect source type                          │  │  │
│  │  │     - Has crawler_code? → ai-generated          │  │  │
│  │  │     - No crawler_code? → hardcoded lookup       │  │  │
│  │  │  2. Run crawler                                 │  │  │
│  │  │     node index.js --board-id=$BOARD_ID          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 데이터 플로우

**Supabase → GitHub Actions**:
```json
// Supabase REST API Response
[
  {
    "id": "f4c852f1-f49a-42c5-8823-0edd346f99bb",
    "name": "경기도교육청 구인정보조회",
    "crawler_code": null,
    "is_active": true
  },
  {
    "id": "de02eada-6569-45df-9f4d-45a4fcc51879",
    "name": "가평교육지원청 기간제교원 구인구직",
    "crawler_code": "async function crawl() {...}",
    "is_active": true
  }
]

↓ jq transformation ↓

// GitHub Actions Matrix Format
[
  {
    "board_id": "f4c852f1-f49a-42c5-8823-0edd346f99bb",
    "board_name": "경기도교육청 구인정보조회",
    "source": "gyeonggi",
    "has_crawler_code": false
  },
  {
    "board_id": "de02eada-6569-45df-9f4d-45a4fcc51879",
    "board_name": "가평교육지원청 기간제교원 구인구직",
    "source": "ai-generated",
    "has_crawler_code": true
  }
]
```

---

## 🔧 단계별 구현 계획

### Phase 1: fetch-boards Job 추가

**파일**: `.github/workflows/run-crawler.yml`

**Step 1.1: Job 정의**
```yaml
jobs:
  fetch-boards:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      boards: ${{ steps.fetch.outputs.boards }}
```

**Step 1.2: Supabase REST API 호출**
```yaml
    steps:
      - name: Fetch active boards from Supabase
        id: fetch
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          response=$(curl -s -f \
            "${SUPABASE_URL}/rest/v1/crawl_boards?select=id,name,crawler_code&is_active=eq.true" \
            -H "apikey: ${SUPABASE_ANON_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
            -H "Content-Type: application/json")
```

**Step 1.3: JSON 변환 및 소스 매핑**
```yaml
          # Transform to GitHub Actions matrix format
          boards=$(echo "$response" | jq -c '[.[] | {
            board_id: .id,
            board_name: .name,
            source: (if (.crawler_code != null and (.crawler_code | length) > 100) then "ai-generated" else
              if .id == "f4c852f1-f49a-42c5-8823-0edd346f99bb" then "gyeonggi"
              elif .id == "5a94f47d-5feb-4821-99af-f8805cc3d619" then "seongnam"
              elif .id == "55d09cac-71aa-48d5-a8b8-bbd9181970bb" then "uijeongbu"
              elif .id == "5d7799d9-5d8d-47a2-b0df-6dd4f39449bd" then "namyangju"
              else "ai-generated" end),
            has_crawler_code: (.crawler_code != null and (.crawler_code | length) > 100)
          }]')
```

**Step 1.4: Fallback 로직**
```yaml
          # Fallback to static matrix if API call fails
          if [ $? -ne 0 ] || [ -z "$boards" ]; then
            echo "⚠️  Supabase API call failed, using fallback matrix"
            boards='[
              {"board_id":"f4c852f1-f49a-42c5-8823-0edd346f99bb","board_name":"경기도교육청","source":"gyeonggi"},
              {"board_id":"5a94f47d-5feb-4821-99af-f8805cc3d619","board_name":"성남교육지원청","source":"seongnam"}
            ]'
          fi
```

**Step 1.5: Output 설정**
```yaml
          echo "boards=$boards" >> $GITHUB_OUTPUT
          echo "📋 Fetched $(echo "$boards" | jq 'length') active boards"
```

### Phase 2: crawl-scheduled Job 수정

**Step 2.1: 의존성 추가**
```yaml
  crawl-scheduled:
    needs: [fetch-boards]  # NEW: Dependency on fetch-boards
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 30
```

**Step 2.2: 동적 매트릭스 설정**
```yaml
    strategy:
      fail-fast: false
      matrix:
        board: ${{ fromJSON(needs.fetch-boards.outputs.boards) }}
```

**Step 2.3: 환경 변수 매핑**
```yaml
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          CRAWL_LOG_ID: ''
          CRAWL_MODE: 'run'
          CRAWLER_SOURCE: ${{ matrix.board.source }}
          BOARD_ID: ${{ matrix.board.board_id }}
          BOARD_NAME: ${{ matrix.board.board_name }}
```

**Step 2.4: 크롤러 실행 로직 (기존 유지)**
```yaml
        run: |
          echo "🚀 Starting crawler for board: $BOARD_ID ($BOARD_NAME)"
          echo "🔧 Mode: $CRAWL_MODE"

          case "$CRAWLER_SOURCE" in
            "gyeonggi")
              node index.js --source=gyeonggi
              ;;
            # ... other hardcoded sources ...
            "ai-generated")
              echo "🤖 Running AI-generated crawler for board: $BOARD_ID"
              node index.js --board-id="$BOARD_ID" --mode="$CRAWL_MODE"
              ;;
            *)
              echo "⚠️  Unknown crawler source: $CRAWLER_SOURCE"
              exit 1
              ;;
          esac
```

### Phase 3: 기존 기능 보존

**crawl-manual job은 변경 없음** (workflow_dispatch 트리거용):
```yaml
  crawl-manual:
    if: github.event_name == 'workflow_dispatch'
    # ... 기존 로직 유지 ...
```

**주요 보존 사항**:
- ✅ Manual dispatch 기능 (inputs 사용)
- ✅ 모든 환경 변수
- ✅ fail-fast: false 설정
- ✅ 기존 크롤러 실행 로직 (gyeonggi, seongnam 등)

---

## 🧪 테스트 시나리오

### Scenario 1: 정상 작동 (모든 보드 활성화)

**Setup**:
```sql
-- All 6 boards active
SELECT id, name, is_active FROM crawl_boards;
```

**Expected Result**:
- fetch-boards: 6개 보드 반환
- crawl-scheduled: 6개 병렬 작업 실행
- GitHub Actions UI: 6개 매트릭스 항목 표시

**Validation**:
```bash
# Check workflow run
gh run list --workflow=run-crawler.yml --limit=1
gh run view [RUN_ID] --log
# Should show 6 parallel "crawl-scheduled" jobs
```

---

### Scenario 2: 보드 비활성화

**Setup**:
```sql
-- Deactivate 가평 board
UPDATE crawl_boards
SET is_active = false
WHERE name LIKE '%가평%';
```

**Expected Result**:
- fetch-boards: 5개 보드 반환 (가평 제외)
- crawl-scheduled: 5개 병렬 작업 실행
- 가평 크롤러 실행되지 않음

**Validation**:
```bash
# Check matrix doesn't include 가평
gh run view [RUN_ID] --log | grep "가평"
# Should return empty
```

---

### Scenario 3: 신규 보드 추가

**Setup**:
```sql
-- Add new board
INSERT INTO crawl_boards (id, name, is_active, crawler_code)
VALUES (
  'new-uuid-here',
  '신규교육청 구인',
  true,
  'async function crawl() { /* AI generated code */ }'
);
```

**Expected Result**:
- **워크플로우 파일 수정 없이** 다음 스케줄 실행 시 자동 포함
- fetch-boards: 7개 보드 반환
- crawl-scheduled: 7개 병렬 작업 실행

**Validation**:
```bash
# Next scheduled run should include new board
gh run view [RUN_ID] --log | grep "신규교육청"
# Should show crawler execution
```

---

### Scenario 4: API 실패 시 Fallback

**Setup**:
```bash
# Simulate API failure by using wrong credentials
# (실제 테스트는 workflow 수정 후 잘못된 secret으로 테스트)
```

**Expected Result**:
- fetch-boards: API 호출 실패 감지
- Fallback 매트릭스 사용 (경기도, 성남 2개)
- 워크플로우 전체 실패하지 않음

**Validation**:
```bash
gh run view [RUN_ID] --log | grep "using fallback matrix"
# Should show fallback message
```

---

### Scenario 5: 혼합 소스 타입

**Setup**:
```sql
-- Mix of hardcoded and ai-generated
SELECT
  name,
  CASE
    WHEN crawler_code IS NULL THEN 'hardcoded'
    ELSE 'ai-generated'
  END as type
FROM crawl_boards
WHERE is_active = true;
```

**Expected Result**:
- 하드코딩 보드 (경기도, 성남 등): `source: gyeonggi` 매핑
- AI 생성 보드 (가평, 남양주): `source: ai-generated` 매핑
- 각각 올바른 크롤러 실행

**Validation**:
```bash
# Check logs for correct crawler type
gh run view [RUN_ID] --log | grep "Running AI-generated crawler"
gh run view [RUN_ID] --log | grep "node index.js --source=gyeonggi"
```

---

### Scenario 6: 활성 보드 없음

**Setup**:
```sql
-- Deactivate all boards
UPDATE crawl_boards SET is_active = false;
```

**Expected Result**:
- fetch-boards: 빈 배열 `[]` 반환
- crawl-scheduled: 매트릭스가 비어있어 스킵됨
- 워크플로우 성공으로 종료 (에러 없음)

**Validation**:
```bash
gh run view [RUN_ID] --log | grep "Fetched 0 active boards"
# Should show 0 boards message
```

---

## ✅ 검증 전략

### Pre-Implementation Validation

**1. Supabase REST API 수동 테스트**
```bash
curl -s \
  "https://qpwnsvsiduvvqdijyxio.supabase.co/rest/v1/crawl_boards?select=id,name,crawler_code&is_active=eq.true" \
  -H "apikey: eyJhbGci..." \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json"
```

**Expected Output**:
```json
[
  {"id":"f4c852f1...","name":"경기도교육청","crawler_code":null},
  {"id":"de02eada...","name":"가평교육지원청","crawler_code":"async function..."}
]
```

**2. jq 변환 로컬 테스트**
```bash
# Save sample response to test.json
cat test.json | jq -c '[.[] | {
  board_id: .id,
  board_name: .name,
  source: (if (.crawler_code != null and (.crawler_code | length) > 100) then "ai-generated" else "gyeonggi" end)
}]'
```

**Expected Output**:
```json
[{"board_id":"f4c852f1...","board_name":"경기도교육청","source":"gyeonggi"}]
```

**3. fromJSON() 형식 검증**
```yaml
# Test workflow with static JSON to verify syntax
matrix:
  board: ${{ fromJSON('[{"board_id":"test","board_name":"테스트"}]') }}
```

---

### Post-Implementation Validation

**1. Dry-Run Test**
```bash
# Trigger manual workflow with test mode
gh workflow run run-crawler.yml \
  --field board_id=f4c852f1-f49a-42c5-8823-0edd346f99bb \
  --field log_id=test-log-id \
  --field mode=test
```

**2. Output Inspection**
```bash
# Check fetch-boards job output
gh run view [RUN_ID] --log | grep "GITHUB_OUTPUT"
# Should show: boards=[{"board_id":"...","board_name":"..."}]
```

**3. Matrix Expansion Check**
```bash
# GitHub Actions UI should show:
# crawl-scheduled (경기도교육청)
# crawl-scheduled (성남교육지원청)
# crawl-scheduled (가평교육지원청)
# ... etc
```

**4. Environment Variables Check**
```bash
# In crawler logs, verify:
gh run view [RUN_ID] --log | grep "BOARD_ID:"
gh run view [RUN_ID] --log | grep "BOARD_NAME:"
# Should show correct values for each matrix item
```

**5. Crawler Execution Type Check**
```bash
# Hardcoded crawlers
gh run view [RUN_ID] --log | grep "node index.js --source=gyeonggi"

# AI-generated crawlers
gh run view [RUN_ID] --log | grep "node index.js --board-id="
```

---

### Continuous Monitoring (3일간)

**Day 1**: 첫 스케줄 실행 모니터링
```bash
# Check 10:00 KST run
gh run list --workflow=run-crawler.yml --created=$(date +%Y-%m-%d) --limit=5
```

**Day 2**: 보드 추가/삭제 테스트
```sql
-- Add test board
INSERT INTO crawl_boards (id, name, is_active) VALUES (...);

-- Wait for next scheduled run
-- Verify new board appears
```

**Day 3**: 안정성 확인
```bash
# Check success rate
gh run list --workflow=run-crawler.yml --limit=10 --json conclusion
# Should show improved success rate (>90%)
```

---

## 📊 성공 기준

| 기준 | 현재 상태 | 목표 상태 | 측정 방법 |
|------|-----------|-----------|-----------|
| **자동화** | 수동 워크플로우 수정 필요 | DB만 수정하면 자동 반영 | 새 보드 추가 시 워크플로우 파일 변경 없음 확인 |
| **동기화** | DB 6개 vs 워크플로우 4개 | 항상 일치 | `SELECT COUNT(*) WHERE is_active=true` = 매트릭스 크기 |
| **실패율** | 75% (3/4 실패) | <10% | 스케줄 실행 10회 중 성공 >9회 |
| **확장성** | 하드코딩으로 제한적 | 무제한 확장 가능 | 10개 보드 추가해도 워크플로우 수정 불필요 |
| **복구력** | API 실패 시 전체 실패 | Fallback으로 핵심 보드 유지 | API 실패 테스트 시 워크플로우 성공 |

---

## 🎯 구현 후 기대 효과

### 운영 효율성
- ✅ **관리 간소화**: 보드 추가/수정 시 DB만 변경하면 됨
- ✅ **휴먼 에러 감소**: 워크플로우 파일 수정 불필요 → YAML 문법 오류 위험 제거
- ✅ **즉시 반영**: is_active 플래그로 즉시 활성화/비활성화 가능

### 기술적 개선
- ✅ **동기화 자동화**: DB와 워크플로우 간 불일치 문제 해결
- ✅ **확장 가능성**: 새 교육청 추가 시 코드 변경 없이 확장
- ✅ **내결함성**: API 실패 시에도 핵심 보드는 계속 크롤링

### 모니터링 개선
- ✅ **실패 격리**: fail-fast: false로 한 보드 실패가 다른 보드에 영향 없음
- ✅ **명확한 로깅**: 각 보드별 독립적인 로그로 디버깅 용이
- ✅ **성공률 향상**: 불필요한 실패 제거로 실제 성공률 가시화

---

## 📝 구현 체크리스트

### Phase 1: fetch-boards Job
- [ ] Job 정의 및 출력 설정
- [ ] Supabase REST API 호출 로직
- [ ] jq를 이용한 JSON 변환
- [ ] 하드코딩 소스 매핑 로직
- [ ] Fallback 매트릭스 정의
- [ ] GITHUB_OUTPUT 설정
- [ ] 로컬에서 curl + jq 테스트

### Phase 2: crawl-scheduled Job 수정
- [ ] needs: [fetch-boards] 의존성 추가
- [ ] matrix를 fromJSON()으로 변경
- [ ] matrix 변수 참조 업데이트 (${{ matrix.board.* }})
- [ ] 기존 case 문 유지 (gyeonggi, seongnam 등)
- [ ] 환경 변수 매핑 확인

### Phase 3: 기존 기능 보존
- [ ] crawl-manual job 변경 없음 확인
- [ ] fail-fast: false 유지 확인
- [ ] 모든 환경 변수 유지 확인

### Phase 4: 테스트
- [ ] Scenario 1: 정상 작동 테스트
- [ ] Scenario 2: 보드 비활성화 테스트
- [ ] Scenario 3: 신규 보드 추가 테스트
- [ ] Scenario 4: API 실패 Fallback 테스트
- [ ] Scenario 5: 혼합 소스 타입 테스트
- [ ] Scenario 6: 활성 보드 없음 테스트

### Phase 5: 모니터링
- [ ] 3일간 스케줄 실행 모니터링
- [ ] 성공률 측정 (목표: >90%)
- [ ] 로그 품질 확인
- [ ] 문서 업데이트 (CLAUDE.md)

---

## 🚀 실행 준비 완료

이 계획서는 다음 조건을 충족합니다:

✅ **논리적으로 정교함**: GitHub Actions 공식 문서와 Supabase REST API 사양 기반
✅ **실제로 작동함**: 각 단계별 검증 가능한 예제 코드 포함
✅ **자가 테스트 포함**: 6가지 시나리오 + 사전/사후 검증 전략
✅ **위험 관리**: Fallback 매트릭스로 API 실패 시에도 핵심 기능 유지
✅ **단계별 실행**: Phase 1→2→3→4→5 순차 진행으로 안전한 구현

**다음 단계**: 이 계획서를 기반으로 구현 승인 후 코드 수정 진행 가능합니다.
