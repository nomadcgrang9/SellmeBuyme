# 위치 기반 정렬 구현 완료 보고서

## 문제 상황

익명 사용자가 성남시 분당구에서 접속했는데도 구리/남양주 카드가 먼저 표시되는 문제가 발생했습니다.

### 근본 원인

1. **localStorage 캐시 데이터 형식 불일치**
   - 기존 캐시: `{ city: "성남시 분당구", district: "서현동" }`
   - 예상 형식: `{ city: "성남", district: "분당" }`

2. **정규화 시점 문제**
   - Kakao API 응답을 받을 때만 정규화 수행
   - 캐시된 데이터는 정규화되지 않은 상태로 사용
   - 결과: `sortCardsByLocation()`의 매칭 로직이 제대로 작동하지 않음

3. **로그 분석**
   - `🗺️ [Kakao API 응답]` 로그가 없음 → API 호출 안 됨 (캐시 사용 중)
   - `📍 [카드 정렬] 위치 기반 정렬 시작` 로그가 없음 → 정렬 함수 호출 안 됨

## 해결 방법

### 1. App.tsx에 정규화 함수 추가

```typescript
// 주소 정규화 함수 (캐시된 데이터도 처리)
const normalizeAddress = (addr: { city: string; district: string }) => {
  // "성남시 분당구" → "성남" 형태로 변환
  // 1. 먼저 "시", "구" 제거
  // 2. 그 다음 공백 제거
  // 3. 첫 번째 단어만 추출 (예: "성남시 분당구" → "성남")
  const cityParts = addr.city.replace(/시/g, '').replace(/구/g, '').trim().split(/\s+/);
  const city = cityParts[0] || '';

  const districtParts = addr.district.replace(/시/g, '').replace(/구/g, '').trim().split(/\s+/);
  const district = districtParts[0] || '';

  return { city, district };
};
```

### 2. 익명 사용자 위치 설정 시 정규화 적용

```typescript
// 익명 사용자: 브라우저 geolocation 사용
if (!user) {
  if (address && address.city) {
    // 중요: 캐시된 데이터도 정규화 처리
    const normalized = normalizeAddress(address);
    console.log('  - 정규화된 도시:', normalized.city);
    console.log('  - 정규화된 구:', normalized.district);

    setUserLocation(normalized);
  }
}
```

### 3. 로그인 사용자 프로필 지역도 정규화

```typescript
// 로그인 사용자: 프로필의 interest_regions 사용
if (user && userProfile) {
  const profileRegion = userProfile.interest_regions?.[0];
  if (profileRegion) {
    // 프로필 지역도 정규화 (혹시 "성남시" 형태로 저장되었을 수 있음)
    const normalized = {
      city: profileRegion.replace(/시$/, ''),
      district: ''
    };
    setUserLocation(normalized);
  }
}
```

## 검증 결과

### 자동화 테스트 (scripts/test/verify-location-sorting.ts)

```bash
npx tsx scripts/test/verify-location-sorting.ts
```

**테스트 1: 주소 정규화 검증**
- ✅ "성남시 분당구" → { city: "성남", district: "" }
- ✅ "성남시" → { city: "성남", district: "" }
- ✅ "성남" → { city: "성남", district: "" }
- ✅ "수원 시" → { city: "수원", district: "" }

**테스트 2: 위치 점수 계산 검증 (사용자: 성남)**
- ✅ 성남시 수정구 → 900점 (같은 시)
- ✅ 광주시 → 800점 (인접 도시 1순위)
- ✅ 하남시 → 790점 (인접 도시 2순위)
- ✅ 용인시 → 780점 (인접 도시 3순위)
- ✅ 수원시 → 770점 (인접 도시 4순위)
- ✅ 구리시 → 100점 (경기도 기타)
- ✅ 남양주시 → 100점 (경기도 기타)

**테스트 3: localStorage 캐시 시나리오**
- ✅ 캐시된 "성남시 분당구" → 정규화 후 "성남"
- ✅ 정규화된 데이터로 점수 계산 정상 작동

**테스트 4: 프로필 지역 정규화**
- ✅ "성남" → "성남"
- ✅ "성남시" → "성남"

## 구현 완료 기능

### Option B 방식 (사용자별 맞춤형)

1. **익명 사용자**
   - Browser Geolocation API로 GPS 좌표 획득
   - Kakao Maps Reverse Geocoding으로 주소 변환
   - localStorage에 24시간 캐싱
   - 캐시된 데이터도 정규화 처리 (✅ 신규 추가)

2. **로그인 사용자**
   - 프로필 `interest_regions` 필드 사용
   - 프로필 지역도 정규화 처리 (✅ 신규 추가)

3. **정렬 우선순위**
   - 1순위: 같은 구 (1000점) - 예: 분당구
   - 2순위: 같은 시 (900점) - 예: 성남시
   - 3순위: 인접 도시 (800-770점) - 예: 광주, 하남, 용인, 수원
   - 4순위: 경기도 기타 (100점)
   - 5순위: 위치 정보 없음 (0점)

4. **사용자 제어**
   - 검색어 입력 시 → 위치 정렬 비활성화
   - 지역 필터 변경 시 → 위치 정렬 비활성화
   - 카테고리 필터 변경 시 → 위치 정렬 비활성화
   - 파란색 배너에서 "정렬 해제" 버튼으로 수동 비활성화

5. **UI 안내**
   - 익명 사용자: "현재 위치 기반 정렬"
   - 로그인 사용자: "프로필 기반 위치 정렬"
   - 위치 확인 중: 로딩 스피너와 안내 메시지

## 사용자 테스트 방법

1. **브라우저 접속**
   ```
   http://localhost:5176
   ```

2. **위치 권한 허용**
   - 브라우저 주소창 왼쪽의 위치 아이콘 클릭
   - "허용" 선택

3. **콘솔 로그 확인 (F12)**
   ```
   🔍 [위치 기반 정렬] useEffect 실행
     - 감지된 도시 (원본): 성남시 분당구
     - 감지된 구 (원본): 서현동
     - 정규화된 도시: 성남
     - 정규화된 구: 서현동
   📍 [정렬 모드] 현재 위치(성남)를 기준으로 카드를 정렬합니다.

   📍 [카드 정렬] 위치 기반 정렬 시작
     - 사용자 도시: 성남
     - 사용자 구: 서현동
   ✅ [카드 정렬] 완료
   ```

4. **화면 확인**
   - 파란색 배너: "현재 위치 기반 정렬 - 성남 서현동 지역을 중심으로..."
   - 카드 순서: 성남 → 광주/하남/용인/수원 → 기타 경기 → 나머지

5. **localStorage 확인 (선택)**
   ```javascript
   // 콘솔에서 실행
   JSON.parse(localStorage.getItem('user_location'))
   // 출력: { city: "성남시 분당구", district: "서현동", coords: {...}, timestamp: ... }
   ```
   - 캐시된 데이터가 정규화되지 않은 형태여도 정상 작동 (자동 정규화)

6. **정렬 해제 테스트**
   - 검색창에 "수원" 입력 → 성남 카드 사라짐, 수원만 표시
   - 지역 필터 "수원" 선택 → 파란색 배너 사라짐, 수원만 표시
   - "정렬 해제" 버튼 클릭 → 파란색 배너 사라짐

## 기술적 세부사항

### 정규화 로직 설명

**문제 상황:**
```javascript
// 잘못된 순서 (기존)
"성남시 분당구"
  .replace(/\s+/g, '')     // "성남시분당구"
  .replace(/시$/, '')      // "성남시분당구" (끝에 시가 없어서 변화 없음)
  .replace(/구$/, '')      // "성남시분당" (끝의 구만 제거)
// 결과: "성남시분당" ❌
```

**해결 방법:**
```javascript
// 올바른 순서 (신규)
"성남시 분당구"
  .replace(/시/g, '')      // "성남 분당구" (모든 시 제거)
  .replace(/구/g, '')      // "성남 분당" (모든 구 제거)
  .trim()                  // "성남 분당"
  .split(/\s+/)           // ["성남", "분당"]
  [0]                     // "성남" ✅
```

### 코드 위치

- **[App.tsx:266-279](src/App.tsx#L266-L279)**: `normalizeAddress()` 함수
- **[App.tsx:321-339](src/App.tsx#L321-L339)**: 익명 사용자 위치 정규화
- **[App.tsx:290-308](src/App.tsx#L290-L308)**: 로그인 사용자 프로필 정규화
- **[App.tsx:59-141](src/App.tsx#L59-L141)**: `sortCardsByLocation()` 함수
- **[geocoding.ts:21-72](src/lib/utils/geocoding.ts#L21-L72)**: Kakao API 호출 및 정규화

### 주요 변경 사항

1. ✅ `normalizeAddress()` 함수 추가 - 캐시된 데이터 정규화
2. ✅ 익명 사용자 useEffect에서 정규화 적용
3. ✅ 로그인 사용자 프로필 지역 정규화 적용
4. ✅ 상세한 디버그 로그 추가
5. ✅ 검증 스크립트 작성 및 테스트 완료

## 예상 시나리오별 동작

### 시나리오 1: 성남에서 처음 접속 (캐시 없음)
1. GPS 좌표 획득
2. Kakao API 호출 → `{ region_2depth_name: "성남시", region_3depth_name: "분당구" }`
3. 정규화 → `{ city: "성남", district: "분당" }`
4. localStorage 저장 (원본 형태)
5. userLocation 설정 (정규화된 형태)
6. 카드 정렬: 성남 → 광주/하남/용인/수원 → 기타

### 시나리오 2: 성남에서 재접속 (캐시 있음, 24시간 이내)
1. localStorage에서 캐시 읽기 → `{ city: "성남시 분당구", district: "서현동" }`
2. Kakao API 호출 안 함
3. **정규화 적용 (신규)** → `{ city: "성남", district: "서현동" }`
4. userLocation 설정 (정규화된 형태)
5. 카드 정렬: 성남 → 광주/하남/용인/수원 → 기타

### 시나리오 3: 로그인 사용자 (프로필: 성남)
1. 브라우저 위치 무시
2. 프로필 `interest_regions[0]` 읽기 → "성남" 또는 "성남시"
3. **정규화 적용** → `{ city: "성남", district: "" }`
4. userLocation 설정
5. 카드 정렬: 성남 → 광주/하남/용인/수원 → 기타

### 시나리오 4: 사용자가 "수원" 검색
1. `hasActiveSearch()` → true (검색어 있음)
2. userLocation → null 설정
3. 파란색 배너 숨김
4. 카드 필터링: 수원만 표시 (위치 정렬 안 함)

## 후속 작업 (선택)

1. **로그 정리**: 프로덕션 배포 전 디버그 로그 제거 또는 환경변수로 제어
2. **캐시 업데이트**: localStorage에 저장할 때부터 정규화된 형태로 저장 (선택)
3. **에러 처리**: Kakao API 호출 실패 시 fallback 로직 개선
4. **성능 최적화**: 인접 도시 목록을 DB나 별도 파일로 관리

## 결론

✅ **구현 완료**: 익명 사용자의 위치 기반 정렬이 정상 작동합니다.
✅ **캐시 문제 해결**: localStorage 캐시 데이터 형식과 무관하게 정규화 처리됩니다.
✅ **검증 완료**: 자동화 테스트 스크립트로 모든 케이스 검증 완료.
✅ **사용자 경험**: 수동 필터/검색 시 자동으로 위치 정렬 비활성화.

**개발 서버**: `http://localhost:5176` (현재 실행 중)
**검증 스크립트**: `npx tsx scripts/test/verify-location-sorting.ts`
