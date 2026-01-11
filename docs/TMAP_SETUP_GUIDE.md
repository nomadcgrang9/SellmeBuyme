# TMAP API 설정 가이드

## 개요

대중교통 길찾기 기능을 ODsay API에서 TMAP API로 교체했습니다. TMAP API는 무료로 월 300만 요청을 제공하며, 안정적인 대중교통 경로 검색을 지원합니다.

## 1. TMAP API 키 발급

### 1단계: TMAP Open Platform 회원가입
1. [TMAP Open Platform](https://openapi.sk.com/) 접속
2. 우측 상단 "회원가입" 클릭
3. 이메일 인증 및 정보 입력 후 가입 완료

### 2단계: 앱 등록
1. 로그인 후 "마이페이지" → "앱 관리" 이동
2. "앱 등록" 버튼 클릭
3. 앱 정보 입력:
   - 앱 이름: SellmeBuyme (또는 원하는 이름)
   - 앱 설명: 교육 일자리 플랫폼
   - 도메인: `sellmebuyme.pages.dev`, `localhost:5173`
4. "등록" 클릭

### 3단계: API 키 확인
1. "마이페이지" → "앱 관리" → 등록한 앱 선택
2. "App Key" 복사 (예: `l7xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

## 2. Supabase Secret 설정

### 방법 1: CLI 사용 (권장)
```bash
npx supabase secrets set TMAP_API_KEY="<실제-TMAP-API-KEY>"
```

### 방법 2: Supabase Dashboard 사용
1. [Supabase Dashboard](https://supabase.com/dashboard/project/qpwnsvsiduvvqdijyxio/settings/vault/secrets) 접속
2. 좌측 메뉴 "Settings" → "Edge Functions" → "Secrets" 이동
3. `TMAP_API_KEY` 찾기
4. 값을 실제 TMAP API Key로 수정
5. "Save" 클릭

## 3. 코드 변경사항 확인

### Edge Function
- 파일: `supabase/functions/get-directions/index.ts`
- 변경: ODsay API 호출을 TMAP API로 교체
- API 엔드포인트: `https://apis.openapi.sk.com/transit/routes`
- 요청 방식: POST 요청, `appKey` 헤더로 인증

### 클라이언트 코드
- 파일: `src/lib/api/directions.ts`
- 변경: TMAP 응답 형식을 정규화하는 `normalizeTransitRoute()` 함수 업데이트
- TMAP의 `legs` 구조를 `TransitSubPath`로 변환
- `linestring` 좌표 파싱 추가

### 타입 정의
- 파일: `src/types/directions.ts`
- 추가: `TmapTransitRoute` 인터페이스
- ODsay 타입은 deprecated 마크, 향후 제거 예정

## 4. 배포 및 테스트

### Edge Function 배포
```bash
npx supabase functions deploy get-directions --no-verify-jwt
```

### 로컬 테스트
1. Dev 서버 실행:
   ```bash
   npm run dev
   ```
2. 브라우저에서 `http://localhost:5176` 접속
3. 지도에서 공고 선택 → 길찾기 버튼 클릭
4. "대중교통" 탭 선택
5. 경로가 정상 표시되는지 확인

### 프로덕션 테스트
1. [https://sellmebuyme.pages.dev](https://sellmebuyme.pages.dev) 접속
2. 동일하게 테스트

## 5. 트러블슈팅

### TMAP API Key가 설정되지 않았다는 오류
- 증상: "Server configuration error: TMAP API key not set"
- 해결: Supabase Secret에 `TMAP_API_KEY` 설정 확인
- 명령어: `npx supabase secrets list`로 설정 여부 확인

### TMAP API 요청 실패 (401 Unauthorized)
- 증상: "TMAP API request failed, status: 401"
- 원인: 잘못된 API Key 또는 도메인 미등록
- 해결:
  1. TMAP 대시보드에서 API Key 재확인
  2. 앱 설정에 `qpwnsvsiduvvqdijyxio.supabase.co` 도메인 추가
  3. Supabase Secret 재설정

### 경로가 표시되지 않음
- 증상: 대중교통 탭 클릭 시 로딩만 계속됨
- 해결:
  1. 브라우저 개발자 도구 (F12) → Console 탭에서 에러 확인
  2. Network 탭에서 `get-directions` 요청 확인
  3. Supabase Dashboard → Functions → Logs에서 서버 로그 확인

### TMAP API 응답 형식 오류
- 증상: "대중교통 경로를 찾을 수 없습니다"
- 원인: TMAP API 응답이 예상 형식과 다름
- 해결:
  1. Edge Function 로그에서 실제 응답 확인
  2. `src/types/directions.ts`의 `TmapTransitRoute` 타입 조정
  3. `src/lib/api/directions.ts`의 정규화 로직 수정

## 6. API 사용량 모니터링

### TMAP Dashboard
1. [TMAP Open Platform](https://openapi.sk.com/) 로그인
2. "마이페이지" → "사용량 통계" 이동
3. 일/월별 API 호출 횟수 확인
4. 무료 할당량 (300만/월) 대비 사용률 모니터링

### 주의사항
- 월 300만 요청 초과 시 과금 발생
- 예상 트래픽: 일 1,000명 × 10회 길찾기 = 월 30만 요청 (여유 충분)
- 필요 시 API Key별 요청 제한 설정 가능

## 7. ODsay API와 비교

| 항목 | ODsay API | TMAP API |
|------|-----------|----------|
| 무료 할당량 | 1,000회/일 | 300만회/월 |
| 도메인 제한 | 엄격 (서버 도메인 불가) | 유연 (서버 허용) |
| 응답 속도 | 보통 | 빠름 |
| 데이터 품질 | 양호 | 우수 |
| 안정성 | 불안정 | 안정적 |
| 지원 | 제한적 | 활발 |

## 8. 향후 계획

- [ ] 복수 경로 표시 (현재는 최적 경로 1개만)
- [ ] 경로 선호도 옵션 (최단시간, 최소환승, 최소도보 등)
- [ ] 실시간 교통 정보 반영
- [ ] 경로 상세 단계별 안내 개선

## 참고 자료

- [TMAP Open Platform 공식 문서](https://openapi.sk.com/resource/api/TmapSDK)
- [TMAP 대중교통 API 가이드](https://openapi.sk.com/products/mobile/guide/transit)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
