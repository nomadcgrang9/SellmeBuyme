# SellmeBuyme 아키텍처 문서

## 📋 프로젝트 개요
사용자가 직접 공고를 등록하고 수정할 수 있는 기능을 구현하는 프로젝트

---

## 🏗️ 백엔드 구조

### 데이터베이스 (Supabase PostgreSQL)

#### `job_postings` 테이블
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- organization (TEXT) - 학교명
- title (TEXT) - 공고 제목
- location (TEXT) - 지역 (포맷: "서울(강남구, 서초구) · 경기(성남)")
- content (TEXT) - 공고 상세 내용
- compensation (TEXT) - 급여/처우
- deadline (DATE) - 모집 마감일
- school_level (TEXT) - 학교급 (포맷: "초등, 중등, 고등")
- subject (TEXT) - 과목
- source (TEXT) - 'crawled' 또는 'user_posted'
- source_url (TEXT) - 크롤링 공고의 원본 URL
- application_period (TEXT) - 모집기간 (포맷: "2025-10-31 ~ 2025-11-15")
- work_period (TEXT) - 근무기간 (포맷: "2025-11-01 ~ 2025-11-30" 또는 "협의 가능")
- contact (TEXT) - 연락처 (포맷: "담당자 / 전화번호 / 이메일")
- attachment_url (TEXT) - 첨부파일 공개 URL (Supabase Storage)
- attachment_path (TEXT) - 첨부파일 저장 경로 (Storage 내부 경로)
- form_payload (JSONB) - 사용자 입력 폼 데이터 (수정 시 재사용)
- detail_content (TEXT) - 구조화된 상세 내용
- qualifications (TEXT[]) - 자격요건 배열
- structured_content (JSONB) - AI 파싱된 구조화 데이터
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Storage (Supabase)

#### `job-posting-attachments` 버킷
```
구조: /{user_id}/{timestamp}-{uuid}.{ext}
예: /550e8400-e29b-41d4-a716-446655440000/1704067200000-abc123.pdf

RLS 정책:
- SELECT (public): 모든 사용자 다운로드 가능
- INSERT (authenticated): 로그인 사용자만 업로드 가능
- DELETE (authenticated): 소유자만 삭제 가능
- UPDATE (authenticated): 소유자만 수정 가능
```

### API 함수 (`src/lib/supabase/queries.ts`)

#### 공고 생성
```typescript
createJobPosting(input: CreateJobPostingInput): Promise<JobPostingRow>
- 파일 업로드 → Storage에 저장
- 공개 URL 생성 (getJobAttachmentPublicUrl)
- DB에 저장 (attachment_url, attachment_path, form_payload)
```

#### 공고 수정
```typescript
updateJobPosting(input: UpdateJobPostingInput): Promise<JobPostingRow>
- 기존 공고 소유권 확인
- 파일 처리:
  - removeAttachment=true: 기존 파일 삭제
  - 새 파일 업로드: 기존 파일 삭제 후 새 파일 업로드
  - 기존 파일 유지: attachment_url 재생성
- DB 업데이트
```

#### 데이터 매핑
```typescript
mapJobPostingToCard(job: JobPostingRow): JobPostingCard
- DB 행을 프론트엔드 Card 타입으로 변환
- form_payload에서 필드 추출 (수정 모달용)
```

### Storage 함수 (`src/lib/supabase/storage.ts`)

```typescript
uploadJobAttachment(file: File, userId: string): Promise<string>
- 파일을 Storage에 업로드
- 반환: 저장 경로 (attachment_path)

getJobAttachmentPublicUrl(filePath: string): string
- 공개 URL 생성 (만료 없음)
- 반환: 공개 URL (attachment_url)

deleteJobAttachment(filePath: string): Promise<void>
- Storage에서 파일 삭제

deleteUserAttachments(userId: string): Promise<void>
- 사용자의 모든 첨부파일 삭제 (계정 삭제 시)
```

---

## 🎨 프론트엔드 구조

### 컴포넌트 계층

#### 페이지 레벨
```
App.tsx
├── 상태 관리:
│   ├── cards: Card[] - 모든 공고 카드
│   ├── selectedJob: JobPostingCard | null - 상세보기 선택 공고
│   ├── editingJob: JobPostingCard | null - 수정 중인 공고
│   ├── isEditFormOpen: boolean - 수정 모달 열림 상태
│   └── handleJobEditClick, handleEditFormSuccess 콜백
└── 렌더링:
    ├── CardGrid (공고 목록)
    ├── JobDetailModal (상세보기)
    └── JobPostingEditModal (수정 모달)
```

#### 카드 컴포넌트
```
CardGrid.tsx
├── 공고 목록 렌더링
└── JobCard.tsx (각 공고)
    ├── 호버 상태에서 상세 정보 표시
    ├── "상세보기" 버튼
    └── "수정하기" 버튼 (소유자만)
```

#### 모달 컴포넌트
```
JobDetailModal.tsx
├── 공고 상세 정보 표시
├── 버튼:
│   ├── "공고문 다운로드" (attachment_url 있으면)
│   ├── "원문링크" (source_url 있으면)
│   └── "수정하기" (소유자만)
└── 로직:
    - source === 'user_posted' && attachment_url
      → download 속성으로 다운로드
    - source !== 'user_posted' && attachment_url
      → target="_blank" 새 탭에서 열기

JobPostingEditModal.tsx
├── 기존 데이터 로드 (form_payload에서)
├── 폼 필드:
│   ├── 학교명, 제목, 학교급, 지역
│   ├── 모집기간, 근무기간, 급여, 과목
│   ├── 설명, 연락처
│   └── 첨부파일 (업로드/교체/제거)
├── 제출 시:
│   - updateJobPosting 호출
│   - mapJobPostingToCard로 변환
│   - onSuccess 콜백으로 UI 업데이트
└── 에러 처리: alert 표시
```

#### 폼 컴포넌트
```
JobPostingForm.tsx (공고 등록)
├── 동일한 필드 구조
├── 제출 시: createJobPosting 호출
└── 성공 시: 모달 닫기

FileUploadField.tsx (첨부파일)
├── 드래그 앤 드롭
├── 파일 선택
├── 파일 크기 검증 (10MB 이하)
├── MIME 타입 검증
└── 선택된 파일 표시
```

### 타입 정의 (`src/types/index.ts`)

```typescript
interface JobPostingCard {
  id: string
  type: 'job'
  organization: string
  title: string
  location?: string
  compensation?: string
  deadline?: string
  daysLeft?: number
  application_period?: string
  work_period?: string
  work_time?: string
  contact?: string
  detail_content?: string
  attachment_url?: string
  attachment_path?: string | null
  source_url?: string
  qualifications?: string[]
  structured_content?: StructuredContent | null
  user_id?: string | null
  source?: 'crawled' | 'user_posted'
  form_payload?: JobPostingFormData
}

interface JobPostingFormData {
  organization: string
  title: string
  schoolLevel: JobPostingSchoolLevel
  subject: string
  location: JobPostingLocation
  compensation: string
  recruitmentStart: string
  recruitmentEnd: string
  isOngoing: boolean
  workStart: string
  workEnd: string
  isNegotiable: boolean
  description?: string
  phone: string
  email: string
  attachment?: File | null
}
```

---

## 🔄 데이터 흐름

### 공고 등록 흐름
```
1. 사용자가 JobPostingForm 작성
2. 제출 시:
   - 파일 업로드 (Storage)
   - 공개 URL 생성
   - DB에 저장 (attachment_url, attachment_path, form_payload)
3. 성공 시 모달 닫기
```

### 공고 수정 흐름
```
1. 사용자가 "수정하기" 버튼 클릭
2. JobPostingEditModal 열기
3. form_payload에서 기존 데이터 로드
4. 사용자가 필드 수정
5. 제출 시:
   - 파일 처리:
     a) removeAttachment=true: 기존 파일 삭제
     b) 새 파일 선택: 기존 파일 삭제 후 새 파일 업로드
     c) 파일 미변경: attachment_url 재생성
   - updateJobPosting 호출
   - mapJobPostingToCard로 변환
6. onSuccess 콜백으로 카드 목록 업데이트
7. 모달 닫기
```

### 공고 다운로드 흐름
```
1. 상세보기 모달에서 "공고문 다운로드" 버튼 클릭
2. 버튼 타입 확인:
   a) source === 'user_posted': <a href={attachment_url} download>
      → 브라우저 다운로드 대화상자
   b) source !== 'user_posted': <a href={attachment_url} target="_blank">
      → 새 탭에서 PDF 열기
3. Supabase Storage에서 파일 제공
```

---

## ⚠️ 현재 알려진 이슈

### 1. 공고문 다운로드 미작동
**상태**: 진행 중
**원인**: 
- attachment_url이 DB에 저장되지 않거나 NULL
- Storage 공개 URL 생성 실패 가능성

**디버깅 포인트**:
- DB에서 attachment_url 값 확인
- Storage 버킷 RLS 정책 확인
- 브라우저 개발자 도구에서 네트워크 요청 확인

### 2. 수정 모달 렌더링 에러 (해결됨)
**상태**: 해결
**원인**: location 객체를 직접 렌더링
**해결**: mapJobPostingToCard에 DB 행 직접 전달

---

## 📦 배포 구조

### 마이그레이션 파일
```
supabase/migrations/
├── 20250202_setup_job_attachments_storage.sql
│   └── job-posting-attachments 버킷 생성
└── (기타 기존 마이그레이션)
```

### 환경 변수
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

---

## 🔍 테스트 체크리스트

- [ ] 공고 등록 시 파일 업로드
- [ ] 공고 상세보기에서 "공고문 다운로드" 버튼 표시
- [ ] 다운로드 링크 작동
- [ ] 공고 수정 시 파일 교체
- [ ] 공고 수정 시 파일 제거
- [ ] 수정 후 카드 목록 실시간 업데이트
- [ ] 소유자만 "수정하기" 버튼 표시
- [ ] 크롤링 공고와 사용자 공고 구분

---

## 📝 다음 단계

1. **다운로드 기능 디버깅**
   - DB 쿼리로 attachment_url 값 확인
   - Storage 공개 URL 테스트
   - 브라우저 콘솔 에러 확인

2. **토스트 알림 추가**
   - 수정 성공/실패 피드백
   - 파일 업로드 진행 상황

3. **에러 바운더리 추가**
   - React 렌더링 에러 처리

4. **성능 최적화**
   - 이미지 최적화
   - 번들 크기 감소

---

**작성일**: 2025-01-29
**마지막 수정**: 2025-01-29
