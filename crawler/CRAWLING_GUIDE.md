# 교육청 크롤러 설정 가이드

새로운 교육청을 추가하거나 기존 크롤러가 동작하지 않을 때 이 가이드를 따라 설정값을 추출하세요.

## 1. 크롤러 패턴 분류

| 패턴 | parserType | URL 특징 | 대상 교육청 |
|------|------------|----------|-------------|
| **NTT 패턴** | `ntt` | `selectNttList.do`, `selectNttInfo.do` | 대구, 강원, 충북, 충남, 전남, 경북, 성남, 의정부, 남양주 |
| **POST 패턴** | `post` | `hnfpPbancList.do` (POST 요청) | 경기도 |
| **Custom 패턴** | `custom` | 위에 해당 안 됨 | 서울, 부산, 인천, 광주, 대전, 울산, 세종, 전북, 제주, 경남 |

---

## 2. NTT 패턴 교육청 추가 방법 (가장 쉬움)

### Step 1: 채용공고 게시판 URL 찾기

1. 해당 교육청 홈페이지 접속
2. "채용", "구인", "인력풀" 등의 메뉴 찾기
3. 게시판 URL 확인 (브라우저 주소창)

**확인할 URL 패턴:**
```
https://www.XXX.go.kr/.../selectNttList.do?mi=XXXX&bbsId=YYYY
```

### Step 2: F12 (DevTools) 열고 설정값 추출

#### 2-1. 목록 페이지에서 추출할 값

1. **F12** 누르기 → **Elements** 탭
2. **Ctrl+F** (검색) → `data-id` 검색
3. 아래와 같은 구조 확인:

```html
<table>
  <tbody>
    <tr>
      <td class="ta_l">
        <a class="nttInfoBtn" data-id="12345">제목입니다</a>  <!-- ✅ 이것! -->
      </td>
      <td>2025-01-15</td>  <!-- 날짜 위치 확인 -->
    </tr>
  </tbody>
</table>
```

**추출할 정보:**

| 항목 | 찾는 방법 | 예시 |
|------|-----------|------|
| `baseUrl` | 브라우저 주소창 | `https://www.cbe.go.kr/.../selectNttList.do?mi=12106&bbsId=10170` |
| `mi` | URL에서 `mi=` 뒤의 숫자 | `12106` |
| `bbsId` | URL에서 `bbsId=` 뒤의 숫자 | `10170` |
| `link 셀렉터` | 제목 링크의 CSS 선택자 | `a.nttInfoBtn` 또는 `td.ta_l a` |
| `date 셀렉터` | 날짜가 있는 td 위치 | `td:nth-child(5)` (5번째 열) |

#### 2-2. 상세 페이지 URL 패턴 확인

1. 게시글 하나 클릭
2. URL 확인:
```
https://www.cbe.go.kr/.../selectNttInfo.do?mi=12106&bbsId=10170&nttSn=12345
                                                              ↑ data-id 값
```

3. `detailUrlTemplate` 구성:
```
https://www.cbe.go.kr/.../selectNttInfo.do?mi=12106&bbsId=10170&nttSn=
```
(`nttSn=` 뒤는 비워둠)

### Step 3: sources.json에 추가

```json
{
  "chungbuk": {
    "name": "충청북도교육청 학교구인정보",
    "baseUrl": "https://www.cbe.go.kr/cbe/na/ntt/selectNttList.do?mi=12106&bbsId=10170",
    "detailUrlTemplate": "https://www.cbe.go.kr/cbe/na/ntt/selectNttInfo.do?mi=12106&bbsId=10170&nttSn=",
    "parserType": "ntt",
    "selectors": {
      "rows": "tbody tr",
      "link": "a.nttInfoBtn",
      "date": "td:nth-child(5)"
    },
    "region": "충청북도",
    "isLocalGovernment": false,
    "active": true
  }
}
```

### Step 4: 테스트

```bash
cd crawler
node index.js --source=chungbuk
```

---

## 3. Console에서 셀렉터 테스트하는 방법

F12 → **Console** 탭에서 아래 코드 실행:

### 3-1. 게시글 목록 확인
```javascript
// 테이블 행 개수 확인
document.querySelectorAll('tbody tr').length

// 제목 링크 확인
document.querySelectorAll('a.nttInfoBtn').length
document.querySelectorAll('a[data-id]').length
document.querySelectorAll('td.ta_l a').length

// 첫 번째 게시글의 data-id 확인
document.querySelector('a.nttInfoBtn')?.getAttribute('data-id')
document.querySelector('a[data-id]')?.getAttribute('data-id')
```

### 3-2. 날짜 위치 확인
```javascript
// 각 행의 모든 td 출력
document.querySelectorAll('tbody tr').forEach((row, i) => {
  if (i > 2) return; // 처음 3개만
  const tds = row.querySelectorAll('td');
  tds.forEach((td, j) => {
    console.log(`행${i} - td${j+1}: ${td.textContent.trim().substring(0, 30)}`);
  });
});
```

### 3-3. 상세 페이지 본문 확인
```javascript
// 본문 선택자 테스트
document.querySelector('td.nttCn')?.innerText.substring(0, 200)
document.querySelector('div.nttCn')?.innerText.substring(0, 200)
document.querySelector('.view_con')?.innerText.substring(0, 200)
```

---

## 4. 수정해야 할 파일 목록

| 파일 | 수정 내용 |
|------|-----------|
| `crawler/config/sources.json` | 새 교육청 설정 추가 |
| `crawler/sources/nttPattern.js` | (필요시) 셀렉터 추가 |
| `crawler/index.js` | (불필요) parserType으로 자동 라우팅 |

---

## 5. 교육청별 현재 상태

### 활성화됨 (parserType: ntt)
- ✅ 대구 (`daegu`)
- ✅ 강원 (`gangwon`)
- ✅ 충북 (`chungbuk`)
- ✅ 충남 (`chungnam`)
- ✅ 전남 (`jeonnam`)
- ✅ 경북 (`gyeongbuk`)
- ✅ 성남 (`seongnam`)
- ✅ 의정부 (`uijeongbu`)
- ✅ 남양주 (`namyangju`)

### 활성화됨 (전용 크롤러)
- ✅ 경기 (`gyeonggi`) - POST 패턴
- ✅ 경남 (`gyeongnam`) - div 카드 패턴

### 비활성화됨 (별도 크롤러 필요)
- ❌ 서울 (`seoul`) - work.sen.go.kr
- ❌ 부산 (`busan`) - selectBbsNttList 패턴
- ❌ 인천 (`incheon`) - boardCnts 패턴
- ❌ 광주 (`gwangju`) - xboard 패턴
- ❌ 대전 (`daejeon`) - edurecruit.go.kr
- ❌ 울산 (`ulsan`) - subPage 패턴
- ❌ 세종 (`sejong`) - boardCnts 패턴
- ❌ 전북 (`jeonbuk`) - list.jbe 패턴
- ❌ 제주 (`jeju`) - list.jje 패턴

---

## 6. 문제 해결

### "공고 목록을 찾을 수 없습니다" 에러

1. F12 → Console에서 셀렉터 테스트
2. `sources.json`의 `selectors` 수정
3. 테이블 구조가 다르면 `rows` 셀렉터 변경

### "상세 페이지 로드 실패" 에러

1. `detailUrlTemplate` 확인
2. `nttSn=` 파라미터가 맞는지 확인
3. HTTP vs HTTPS 확인

### 날짜가 안 나옴

1. Console에서 날짜 위치 확인
2. `selectors.date`를 `td:nth-child(N)` 형식으로 수정

---

## 7. 새 교육청 추가 체크리스트

- [ ] 게시판 URL 확인 (`selectNttList.do` 패턴인지)
- [ ] F12에서 `data-id` 또는 `nttInfoBtn` 확인
- [ ] `mi`, `bbsId` 값 추출
- [ ] 상세 URL 패턴 확인 (`selectNttInfo.do`)
- [ ] `sources.json`에 설정 추가
- [ ] `node index.js --source=XXX` 테스트
- [ ] 성공하면 git commit & push
