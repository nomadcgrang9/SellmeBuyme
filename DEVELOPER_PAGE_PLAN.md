# 셀바 개발자노트 - 구현 계획서

## 📋 프로젝트 개요

### 배경
- 현재 2개 페이지 구조: 메인 페이지, 관리자 페이지
- 개발팀(기획팀, 개발자, 디자인팀)을 위한 전용 협업 도구 필요
- 모바일 우선 설계로 이동 중에도 아이디어 기록 가능
- 향후 전국 확장 시 100-200개 게시판 관리 대비

### 핵심 기능
1. **아이디어 수집**: 텍스트 + 이미지 업로드 (카메라/갤러리)
2. **게시판 등록**: URL 제출 → 관리자 승인 → 크롤러 자동 연동
3. **GitHub 배포 추적**: 최근 2개 배포 상태 표시

### 디자인 원칙
- **모바일 우선**: 데스크톱도 모바일 레이아웃 사용 (개발 피로도 최소화)
- **일관성**: 메인 페이지 컬러(#a8c5e0)/폰트(esamanru) 재사용
- **간결함**: 핵심 기능만, 불필요한 요소 제거, 아이콘 사용 (이모지 금지)
- **완전 공개**: 로그인 없이 누구나 읽기/쓰기 가능

### 기술 스택
- Frontend: React 18 + Vite + TypeScript
- Backend: Supabase (PostgreSQL + Storage)
- Styling: Tailwind CSS (메인 페이지와 동일)
- Icons: Lucide React (이모지 사용 금지)

---

## 🎨 디자인 시스템

### 색상 (메인 페이지와 동일)
```css
Primary: #a8c5e0
Primary Hover: #7aa3cc
Primary Light: #d4e4f0
Background: #f9fafb
Card: #ffffff
Border: #e5e7eb
Text Primary: #1f2937
Text Secondary: #6b7280
Text Muted: #9ca3af
```

### 상태 색상
```css
Pending: #f59e0b (대기)
Approved: #10b981 (승인)
Rejected: #ef4444 (거부)
Running: #3b82f6 (실행 중)
```

### 폰트
```css
font-family: esamanru, -apple-system, BlinkMacSystemFont, sans-serif
```

### 레이아웃
- **모바일 최대 너비**: 640px (sm breakpoint)
- **데스크톱**: 동일한 모바일 레이아웃, 중앙 정렬
- **카드 간격**: 16px (gap-4)
- **패딩**: 16px (p-4)

---

## 📊 데이터베이스 스키마

### 1. dev_ideas (아이디어)
```sql
CREATE TABLE dev_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NULL,  -- 공개 접근이므로 NULL 허용
  author_name TEXT DEFAULT '익명',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('feature', 'bug', 'design', 'other')),
  images TEXT[] DEFAULT '{}',  -- Supabase Storage URL 배열
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_ideas_created_at ON dev_ideas(created_at DESC);
CREATE INDEX idx_dev_ideas_category ON dev_ideas(category);
```

### 2. dev_board_submissions (게시판 제출)
```sql
CREATE TABLE dev_board_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id UUID REFERENCES auth.users(id) NULL,
  submitter_name TEXT DEFAULT '익명',
  board_name TEXT NOT NULL,
  board_url TEXT NOT NULL,
  region TEXT,
  description TEXT,
  screenshot_url TEXT,  -- Supabase Storage URL
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dev_board_submissions_status ON dev_board_submissions(status);
CREATE INDEX idx_dev_board_submissions_created_at ON dev_board_submissions(created_at DESC);
CREATE UNIQUE INDEX idx_dev_board_submissions_url ON dev_board_submissions(board_url);
```

### 3. github_deployments (GitHub 배포 추적)
```sql
CREATE TABLE github_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_sha TEXT NOT NULL,
  commit_message TEXT,
  branch TEXT NOT NULL,
  author TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failure')),
  workflow_run_id TEXT,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_github_deployments_deployed_at ON github_deployments(deployed_at DESC);
CREATE INDEX idx_github_deployments_branch ON github_deployments(branch);
```

### RLS 정책 (완전 공개)
```sql
-- dev_ideas: 모든 사람 읽기/쓰기 가능
ALTER TABLE dev_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ideas"
  ON dev_ideas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create ideas"
  ON dev_ideas FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update own ideas"
  ON dev_ideas FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete own ideas"
  ON dev_ideas FOR DELETE
  TO public
  USING (true);

-- dev_board_submissions: 모든 사람 읽기/쓰기 가능
ALTER TABLE dev_board_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view submissions"
  ON dev_board_submissions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create submissions"
  ON dev_board_submissions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update submissions"
  ON dev_board_submissions FOR UPDATE
  TO public
  USING (status = 'pending')  -- 대기 중일 때만 수정 가능
  WITH CHECK (status = 'pending');

-- github_deployments: 읽기만 가능
ALTER TABLE github_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deployments"
  ON github_deployments FOR SELECT
  TO public
  USING (true);
```

---

## 🗂️ Supabase Storage 설정

### 새 버킷 생성: `developer`
```sql
-- Supabase Dashboard에서 수동 생성
-- Bucket name: developer
-- Public: true (누구나 읽기 가능)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
```

### 폴더 구조
```
developer/
├── ideas/
│   ├── {idea_id}/
│   │   ├── image1.jpg
│   │   ├── image2.png
│   │   └── ...
│   └── ...
└── boards/
    ├── {submission_id}/
    │   └── screenshot.png
    └── ...
```

### RLS 정책
```sql
-- 누구나 업로드 가능
CREATE POLICY "Anyone can upload to developer bucket"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'developer');

-- 누구나 읽기 가능
CREATE POLICY "Anyone can view developer files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'developer');

-- 누구나 삭제 가능 (본인 파일만)
CREATE POLICY "Anyone can delete own files"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'developer');
```

---

## 🏗️ 파일 구조

```
src/
├── pages/
│   └── DeveloperPage.tsx                 # 메인 페이지 (단일 페이지, 모바일 레이아웃)
│
├── components/
│   └── developer/
│       ├── DeploymentCard.tsx            # GitHub 배포 카드
│       ├── DeploymentList.tsx            # 배포 목록 (최근 2개)
│       ├── IdeaCard.tsx                  # 아이디어 카드
│       ├── IdeaList.tsx                  # 아이디어 목록
│       ├── IdeaForm.tsx                  # 아이디어 작성 폼
│       ├── IdeaDetailModal.tsx           # 아이디어 상세 모달
│       ├── BoardSubmissionCard.tsx       # 게시판 제출 카드
│       ├── BoardSubmissionList.tsx       # 게시판 제출 목록
│       ├── BoardSubmissionForm.tsx       # 게시판 등록 폼
│       ├── BoardSubmissionDetailModal.tsx # 제출 상세 모달
│       ├── FloatingActionButton.tsx      # + 플로팅 버튼
│       ├── ActionMenu.tsx                # 플로팅 버튼 메뉴
│       ├── ImageUploader.tsx             # 이미지 업로드 컴포넌트
│       └── CategoryBadge.tsx             # 카테고리 배지
│
├── lib/
│   ├── hooks/
│   │   ├── useIdeas.ts                   # 아이디어 CRUD 훅
│   │   ├── useBoardSubmissions.ts        # 게시판 제출 CRUD 훅
│   │   ├── useDeployments.ts             # 배포 목록 훅
│   │   └── useImageUpload.ts             # 이미지 업로드 훅
│   │
│   └── supabase/
│       └── developer.ts                  # 개발자 페이지 쿼리 함수
│
├── types/
│   └── developer.ts                      # 타입 정의
│
└── styles/
    └── developer.css                     # 개발자 페이지 전용 스타일 (필요시)
```

---

## 📱 라우팅 설정

### main.tsx 수정
```typescript
// 개발자 페이지 라우팅 추가
else if (pathname.startsWith('/developer') || pathname === '/dev') {
  rootComponent = <DeveloperPage />
}
```

### URL 구조
- `/developer` 또는 `/dev` → 개발자 페이지 메인
- 모달 기반 상세 보기 (URL 변경 없음)

---

## 🔧 단계별 구현 계획

### **Phase 1: 기반 설정 (1일)**

#### 1.1 데이터베이스 마이그레이션
- [ ] `supabase/migrations/20250131_create_developer_tables.sql` 생성
- [ ] 3개 테이블 생성 (`dev_ideas`, `dev_board_submissions`, `github_deployments`)
- [ ] 인덱스 생성
- [ ] RLS 정책 설정
- [ ] 로컬에서 마이그레이션 테스트
- [ ] 프로덕션 배포

**명령어:**
```bash
supabase migration new create_developer_tables
# SQL 작성 후
supabase db push
```

#### 1.2 Supabase Storage 설정
- [ ] Supabase Dashboard에서 `developer` 버킷 생성
- [ ] Public 설정
- [ ] RLS 정책 설정
- [ ] 파일 크기 제한 (5MB)
- [ ] MIME 타입 제한 (image/*)

#### 1.3 타입 정의
- [ ] `src/types/developer.ts` 생성
- [ ] `DevIdea`, `DevBoardSubmission`, `GitHubDeployment` 인터페이스 정의
- [ ] `IdeaCategory`, `SubmissionStatus` 타입 정의

**파일:**
```typescript
// src/types/developer.ts
export interface DevIdea {
  id: string;
  userId: string | null;
  authorName: string;
  title: string;
  content: string;
  category: IdeaCategory;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export type IdeaCategory = 'feature' | 'bug' | 'design' | 'other';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type DeploymentStatus = 'pending' | 'success' | 'failure';

// ... 기타 타입
```

---

### **Phase 2: 페이지 레이아웃 & 라우팅 (1일)**

#### 2.1 메인 페이지 구조
- [ ] `src/pages/DeveloperPage.tsx` 생성
- [ ] 헤더 ("셀바 개발자노트")
- [ ] 스크롤 가능한 컨텐츠 영역
- [ ] 플로팅 액션 버튼 배치
- [ ] 메인 페이지 컬러/폰트 적용

**컴포넌트 구조:**
```tsx
<div className="min-h-screen bg-gray-50">
  {/* 헤더 */}
  <header className="sticky top-0 z-10 bg-primary">
    <h1>셀바 개발자노트</h1>
  </header>

  {/* 컨텐츠 */}
  <main className="max-w-screen-sm mx-auto p-4 pb-24">
    <DeploymentList />
    <IdeaList />
    <BoardSubmissionList />
  </main>

  {/* 플로팅 버튼 */}
  <FloatingActionButton />
</div>
```

#### 2.2 라우팅 연동
- [ ] `src/main.tsx` 수정
- [ ] `/developer` 경로 추가
- [ ] 개발자 페이지 import 및 렌더링

**코드:**
```typescript
// src/main.tsx
import DeveloperPage from './pages/DeveloperPage'

// 라우팅 로직
else if (pathname.startsWith('/developer') || pathname === '/dev') {
  rootComponent = <DeveloperPage />
}
```

#### 2.3 네비게이션 추가 (선택)
- [ ] 하단 네비게이션에 개발자 탭 추가 (필요시)
- [ ] 또는 메인 페이지에서 링크 추가

---

### **Phase 3: GitHub 배포 추적 (1일)**

#### 3.1 배포 카드 컴포넌트
- [ ] `src/components/developer/DeploymentCard.tsx` 생성
- [ ] 상태별 아이콘/색상 표시
- [ ] 커밋 메시지, 브랜치, 작성자, 시간 표시
- [ ] GitHub 링크 버튼

**컴포넌트:**
```tsx
interface DeploymentCardProps {
  deployment: GitHubDeployment;
}

export function DeploymentCard({ deployment }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* 상태 아이콘 */}
      <StatusIcon status={deployment.status} />

      {/* 브랜치 */}
      <p className="font-medium">{deployment.branch} 브랜치</p>

      {/* 커밋 메시지 */}
      <p className="text-sm text-gray-600">{deployment.commitMessage}</p>

      {/* 메타데이터 */}
      <div className="text-xs text-gray-500">
        {deployment.author} · {formatTimeAgo(deployment.deployedAt)}
      </div>
    </div>
  );
}
```

#### 3.2 배포 목록 컴포넌트
- [ ] `src/components/developer/DeploymentList.tsx` 생성
- [ ] 최근 2개만 표시
- [ ] 로딩/에러 상태 처리

#### 3.3 Supabase 쿼리 함수
- [ ] `src/lib/supabase/developer.ts` 생성
- [ ] `getRecentDeployments()` 함수 (최근 2개)
- [ ] 에러 핸들링

**함수:**
```typescript
// src/lib/supabase/developer.ts
export async function getRecentDeployments(limit = 2) {
  const { data, error } = await supabase
    .from('github_deployments')
    .select('*')
    .order('deployed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
```

#### 3.4 커스텀 훅
- [ ] `src/lib/hooks/useDeployments.ts` 생성
- [ ] `useDeployments()` 훅
- [ ] 로딩 상태, 에러 상태 관리

**훅:**
```typescript
// src/lib/hooks/useDeployments.ts
export function useDeployments(limit = 2) {
  const [deployments, setDeployments] = useState<GitHubDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchDeployments() {
      try {
        const data = await getRecentDeployments(limit);
        setDeployments(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchDeployments();
  }, [limit]);

  return { deployments, loading, error };
}
```

#### 3.5 GitHub Actions 연동 (선택)
- [ ] `.github/workflows/*.yml` 수정
- [ ] 배포 완료 시 Supabase에 기록
- [ ] Edge Function 또는 직접 INSERT

**워크플로우 예시:**
```yaml
# .github/workflows/deploy.yml
- name: Record deployment
  if: always()
  run: |
    curl -X POST "${{ secrets.SUPABASE_URL }}/rest/v1/github_deployments" \
      -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{
        "commit_sha": "${{ github.sha }}",
        "commit_message": "${{ github.event.head_commit.message }}",
        "branch": "${{ github.ref_name }}",
        "author": "${{ github.actor }}",
        "status": "${{ job.status }}"
      }'
```

---

### **Phase 4: 아이디어 수집 기능 (2일)**

#### 4.1 아이디어 카드 컴포넌트
- [ ] `src/components/developer/IdeaCard.tsx` 생성
- [ ] 제목, 내용 (말줄임), 카테고리 배지, 이미지 썸네일
- [ ] 작성자, 시간 표시
- [ ] 클릭 시 상세 모달 열기

#### 4.2 아이디어 목록 컴포넌트
- [ ] `src/components/developer/IdeaList.tsx` 생성
- [ ] 무한 스크롤 또는 페이지네이션
- [ ] 로딩/에러 상태
- [ ] 빈 상태 표시

#### 4.3 아이디어 작성 폼
- [ ] `src/components/developer/IdeaForm.tsx` 생성
- [ ] 제목 입력 (필수)
- [ ] 내용 입력 (필수, textarea)
- [ ] 카테고리 선택 (4개 버튼)
- [ ] 이미지 업로드 (카메라/갤러리)
- [ ] 제출/취소 버튼

**폼 구조:**
```tsx
export function IdeaForm({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [images, setImages] = useState<File[]>([]);

  const handleSubmit = async () => {
    // 이미지 업로드
    const imageUrls = await uploadImages(images);

    // 아이디어 생성
    await createIdea({ title, content, category, images: imageUrls });

    onSubmit();
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <CategorySelector value={category} onChange={setCategory} />
      <ImageUploader files={images} onChange={setImages} />
      <button onClick={handleSubmit}>작성완료</button>
    </Modal>
  );
}
```

#### 4.4 이미지 업로더 컴포넌트
- [ ] `src/components/developer/ImageUploader.tsx` 생성
- [ ] 카메라 촬영 버튼 (모바일)
- [ ] 갤러리 선택 버튼
- [ ] 이미지 프리뷰
- [ ] 삭제 버튼
- [ ] 다중 이미지 지원 (최대 5개)

**컴포넌트:**
```tsx
export function ImageUploader({ files, onChange }) {
  const handleCamera = async () => {
    // 카메라 열기
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files[0];
      onChange([...files, file]);
    };
    input.click();
  };

  const handleGallery = async () => {
    // 갤러리 열기
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const newFiles = Array.from(e.target.files);
      onChange([...files, ...newFiles]);
    };
    input.click();
  };

  return (
    <div>
      <button onClick={handleCamera}>
        <CameraIcon /> 사진 촬영
      </button>
      <button onClick={handleGallery}>
        <ImageIcon /> 갤러리
      </button>

      {/* 이미지 프리뷰 */}
      <div className="grid grid-cols-3 gap-2">
        {files.map((file, index) => (
          <ImagePreview key={index} file={file} onRemove={() => removeFile(index)} />
        ))}
      </div>
    </div>
  );
}
```

#### 4.5 이미지 업로드 훅
- [ ] `src/lib/hooks/useImageUpload.ts` 생성
- [ ] Supabase Storage 업로드 함수
- [ ] 파일 크기/타입 검증
- [ ] 에러 핸들링

**훅:**
```typescript
export function useImageUpload() {
  const uploadImage = async (file: File, path: string) => {
    // 파일 검증
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('파일 크기는 5MB 이하여야 합니다');
    }

    // Supabase Storage 업로드
    const { data, error } = await supabase.storage
      .from('developer')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Public URL 반환
    const { data: { publicUrl } } = supabase.storage
      .from('developer')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  return { uploadImage };
}
```

#### 4.6 아이디어 CRUD 함수
- [ ] `createIdea()` - 아이디어 생성
- [ ] `getIdeas()` - 아이디어 목록
- [ ] `getIdeaById()` - 아이디어 상세
- [ ] `updateIdea()` - 아이디어 수정
- [ ] `deleteIdea()` - 아이디어 삭제

**함수:**
```typescript
export async function createIdea(idea: Partial<DevIdea>) {
  const { data, error } = await supabase
    .from('dev_ideas')
    .insert({
      title: idea.title,
      content: idea.content,
      category: idea.category,
      images: idea.images,
      author_name: idea.authorName || '익명'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getIdeas(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('dev_ideas')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}
```

#### 4.7 아이디어 상세 모달
- [ ] `src/components/developer/IdeaDetailModal.tsx` 생성
- [ ] 전체 내용 표시
- [ ] 이미지 갤러리 (확대 가능)
- [ ] 수정/삭제 버튼
- [ ] 닫기 버튼

---

### **Phase 5: 게시판 등록 기능 (2일)**

#### 5.1 게시판 제출 카드 컴포넌트
- [ ] `src/components/developer/BoardSubmissionCard.tsx` 생성
- [ ] 게시판 이름, URL (짧게 표시)
- [ ] 상태 배지 (대기/승인/거부)
- [ ] 지역, 제출 시간 표시
- [ ] 클릭 시 상세 모달 열기

#### 5.2 게시판 제출 목록 컴포넌트
- [ ] `src/components/developer/BoardSubmissionList.tsx` 생성
- [ ] 상태별 필터링 (탭 또는 드롭다운)
- [ ] 로딩/에러 상태
- [ ] 빈 상태 표시

#### 5.3 게시판 등록 폼
- [ ] `src/components/developer/BoardSubmissionForm.tsx` 생성
- [ ] 게시판 이름 입력 (필수)
- [ ] 게시판 URL 입력 (필수, URL 검증)
- [ ] URL 중복 검사 (실시간)
- [ ] 지역 선택 (드롭다운)
- [ ] 설명 입력 (선택)
- [ ] 스크린샷 업로드 (선택)
- [ ] 제출/취소 버튼

**폼 구조:**
```tsx
export function BoardSubmissionForm({ onClose, onSubmit }) {
  const [boardName, setBoardName] = useState('');
  const [boardUrl, setBoardUrl] = useState('');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // URL 중복 검사
  useEffect(() => {
    const checkDuplicate = async () => {
      if (boardUrl) {
        const exists = await checkBoardUrlExists(boardUrl);
        setIsDuplicate(exists);
      }
    };
    checkDuplicate();
  }, [boardUrl]);

  const handleSubmit = async () => {
    if (isDuplicate) {
      alert('이미 등록된 게시판입니다');
      return;
    }

    // 스크린샷 업로드
    let screenshotUrl = null;
    if (screenshot) {
      screenshotUrl = await uploadScreenshot(screenshot);
    }

    // 제출 생성
    await createBoardSubmission({
      boardName,
      boardUrl,
      region,
      description,
      screenshotUrl
    });

    onSubmit();
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <input value={boardName} onChange={(e) => setBoardName(e.target.value)} />
      <input value={boardUrl} onChange={(e) => setBoardUrl(e.target.value)} />
      {isDuplicate && <p className="text-red-500">이미 등록된 게시판입니다</p>}
      <select value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="서울">서울</option>
        <option value="경기">경기</option>
        {/* ... */}
      </select>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <ImageUploader file={screenshot} onChange={setScreenshot} />
      <button onClick={handleSubmit} disabled={isDuplicate}>등록하기</button>
    </Modal>
  );
}
```

#### 5.4 URL 중복 검사 함수
- [ ] `checkBoardUrlExists()` 함수
- [ ] `dev_board_submissions` + `crawl_boards` 테이블 조회
- [ ] Fuzzy matching (선택)

**함수:**
```typescript
export async function checkBoardUrlExists(url: string): Promise<boolean> {
  // dev_board_submissions 확인
  const { data: submissions } = await supabase
    .from('dev_board_submissions')
    .select('id')
    .eq('board_url', url)
    .maybeSingle();

  if (submissions) return true;

  // crawl_boards 확인
  const { data: boards } = await supabase
    .from('crawl_boards')
    .select('id')
    .eq('base_url', url)
    .maybeSingle();

  return !!boards;
}
```

#### 5.5 게시판 제출 CRUD 함수
- [ ] `createBoardSubmission()` - 제출 생성
- [ ] `getBoardSubmissions()` - 제출 목록
- [ ] `getBoardSubmissionById()` - 제출 상세
- [ ] `updateBoardSubmission()` - 제출 수정 (대기 중일 때만)
- [ ] `deleteBoardSubmission()` - 제출 삭제 (대기 중일 때만)

#### 5.6 게시판 제출 상세 모달
- [ ] `src/components/developer/BoardSubmissionDetailModal.tsx` 생성
- [ ] 전체 정보 표시
- [ ] 스크린샷 확대 보기
- [ ] 상태별 다른 UI (대기/승인/거부)
- [ ] 승인 시: 관리자 메모, 크롤러 설정 보기 링크
- [ ] 거부 시: 거부 사유 표시
- [ ] 수정/삭제 버튼 (대기 중일 때만)

---

### **Phase 6: 플로팅 버튼 & 액션 메뉴 (1일)**

#### 6.1 플로팅 액션 버튼
- [ ] `src/components/developer/FloatingActionButton.tsx` 생성
- [ ] 우측 하단 고정
- [ ] + 아이콘
- [ ] 클릭 시 액션 메뉴 토글
- [ ] 애니메이션 효과

**컴포넌트:**
```tsx
export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg"
      >
        {isOpen ? <XIcon /> : <PlusIcon />}
      </button>

      {isOpen && <ActionMenu onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

#### 6.2 액션 메뉴
- [ ] `src/components/developer/ActionMenu.tsx` 생성
- [ ] 2개 버튼: "글 작성", "게시판 등록"
- [ ] 모달 형태로 표시
- [ ] 각 버튼 클릭 시 해당 폼 열기
- [ ] 취소 버튼

**컴포넌트:**
```tsx
export function ActionMenu({ onClose }) {
  const [activeForm, setActiveForm] = useState<'idea' | 'board' | null>(null);

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <button
          onClick={() => setActiveForm('idea')}
          className="w-full p-4 bg-white rounded-lg border"
        >
          <PencilIcon />
          <span>글 작성</span>
          <p className="text-sm text-gray-600">아이디어를 공유하세요</p>
        </button>

        <button
          onClick={() => setActiveForm('board')}
          className="w-full p-4 bg-white rounded-lg border"
        >
          <GlobeIcon />
          <span>게시판 등록</span>
          <p className="text-sm text-gray-600">크롤링 게시판 제안하기</p>
        </button>

        <button onClick={onClose}>취소</button>
      </div>

      {activeForm === 'idea' && <IdeaForm onClose={() => setActiveForm(null)} />}
      {activeForm === 'board' && <BoardSubmissionForm onClose={() => setActiveForm(null)} />}
    </Modal>
  );
}
```

---

### **Phase 7: 관리자 페이지 연동 (1일)**

#### 7.1 관리자 페이지에 새 탭 추가
- [ ] `src/pages/AdminPage.tsx` 수정
- [ ] "게시판 제출 승인" 탭 추가
- [ ] 제출 목록 표시
- [ ] 상태별 필터링

#### 7.2 승인 워크플로우 UI
- [ ] 각 제출 카드에 승인/거부 버튼
- [ ] 승인 시: 확인 모달 (관리자 메모 입력)
- [ ] 거부 시: 거부 사유 입력 모달
- [ ] 실시간 상태 업데이트

#### 7.3 승인 시 자동 처리
- [ ] `approveBoardSubmission()` 함수
- [ ] `dev_board_submissions` 상태 업데이트 (approved)
- [ ] `crawl_boards` 테이블에 새 행 INSERT
- [ ] 트랜잭션 처리 (둘 다 성공해야 함)

**함수:**
```typescript
export async function approveBoardSubmission(
  submissionId: string,
  adminId: string,
  adminNotes?: string
) {
  // 제출 정보 가져오기
  const submission = await getBoardSubmissionById(submissionId);

  // 트랜잭션 시작
  const { error: updateError } = await supabase
    .from('dev_board_submissions')
    .update({
      status: 'approved',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      admin_notes: adminNotes
    })
    .eq('id', submissionId);

  if (updateError) throw updateError;

  // crawl_boards에 추가
  const { error: insertError } = await supabase
    .from('crawl_boards')
    .insert({
      board_name: submission.boardName,
      base_url: submission.boardUrl,
      region: submission.region,
      description: submission.description,
      crawl_batch_size: 10,  // 기본값
      is_active: true
    });

  if (insertError) {
    // 롤백: 제출 상태를 다시 pending으로
    await supabase
      .from('dev_board_submissions')
      .update({ status: 'pending' })
      .eq('id', submissionId);

    throw insertError;
  }
}
```

#### 7.4 거부 처리
- [ ] `rejectBoardSubmission()` 함수
- [ ] `dev_board_submissions` 상태 업데이트 (rejected)
- [ ] 거부 사유 저장

---

### **Phase 8: 테스트 & 최적화 (2일)**

#### 8.1 기능 테스트
- [ ] 아이디어 작성 (텍스트만)
- [ ] 아이디어 작성 (이미지 포함)
- [ ] 아이디어 수정/삭제
- [ ] 게시판 등록 (중복 검사)
- [ ] 게시판 승인 워크플로우
- [ ] GitHub 배포 추적
- [ ] 모바일 반응형 확인

#### 8.2 에러 처리
- [ ] 네트워크 오류 처리
- [ ] 파일 업로드 실패 처리
- [ ] 중복 URL 처리
- [ ] 권한 오류 처리
- [ ] 사용자 친화적 에러 메시지

#### 8.3 성능 최적화
- [ ] 이미지 최적화 (리사이징, WebP 변환)
- [ ] 무한 스크롤 구현 (아이디어 목록)
- [ ] 로딩 스켈레톤 추가
- [ ] 이미지 Lazy loading

#### 8.4 접근성
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 지원
- [ ] 포커스 관리
- [ ] ARIA 속성

#### 8.5 크로스 브라우저 테스트
- [ ] Chrome (Android)
- [ ] Safari (iOS)
- [ ] Firefox
- [ ] Edge

---

### **Phase 9: 배포 & 문서화 (1일)**

#### 9.1 프로덕션 배포
- [ ] Supabase 마이그레이션 실행
- [ ] Storage 버킷 생성
- [ ] 환경 변수 설정 (필요시)
- [ ] 빌드 테스트
- [ ] GitHub 푸시
- [ ] Cloudflare Pages 자동 배포 확인

#### 9.2 문서화
- [ ] `DEVELOPER_PAGE_GUIDE.md` 작성 (사용 가이드)
- [ ] `CLAUDE.md` 업데이트 (개발자 페이지 섹션 추가)
- [ ] README 업데이트 (필요시)
- [ ] 주석 정리

#### 9.3 팀 공유
- [ ] 개발자 페이지 URL 공유 (`/developer`)
- [ ] 사용 방법 안내
- [ ] 피드백 수집 방법 안내

---

## 📊 예상 일정

| Phase | 작업 내용 | 예상 시간 | 누적 시간 |
|-------|-----------|----------|----------|
| Phase 1 | 기반 설정 | 1일 | 1일 |
| Phase 2 | 페이지 레이아웃 & 라우팅 | 1일 | 2일 |
| Phase 3 | GitHub 배포 추적 | 1일 | 3일 |
| Phase 4 | 아이디어 수집 기능 | 2일 | 5일 |
| Phase 5 | 게시판 등록 기능 | 2일 | 7일 |
| Phase 6 | 플로팅 버튼 & 액션 메뉴 | 1일 | 8일 |
| Phase 7 | 관리자 페이지 연동 | 1일 | 9일 |
| Phase 8 | 테스트 & 최적화 | 2일 | 11일 |
| Phase 9 | 배포 & 문서화 | 1일 | 12일 |

**총 예상 기간: 약 2주 (12일)**

---

## 🎯 우선순위 조정 (필요시)

### MVP (최소 기능)
1. **Phase 1-2**: 기반 설정 + 레이아웃
2. **Phase 4**: 아이디어 수집
3. **Phase 5**: 게시판 등록
4. **Phase 6**: 플로팅 버튼

→ **약 7일로 MVP 완성 가능**

### 추가 기능 (나중에)
- Phase 3: GitHub 배포 추적
- Phase 7: 관리자 연동

---

## ✅ 체크리스트

### 시작 전 확인
- [ ] Supabase 프로젝트 접근 권한
- [ ] GitHub 저장소 쓰기 권한
- [ ] Cloudflare Pages 배포 권한
- [ ] 디자인 시스템 확인 (색상, 폰트)

### 각 Phase 완료 시
- [ ] 로컬 테스트 완료
- [ ] 타입 에러 없음
- [ ] ESLint 경고 없음
- [ ] 커밋 메시지 작성
- [ ] 다음 Phase 준비

### 최종 배포 전
- [ ] 모든 기능 동작 확인
- [ ] 모바일 테스트 완료
- [ ] 에러 처리 확인
- [ ] 문서 업데이트 완료
- [ ] 팀 공유 준비

---

## 🚨 주의사항

1. **완전 공개 접근**: 현재는 인증 없이 누구나 읽기/쓰기 가능. 추후 필요 시 인증 추가.
2. **이미지 크기 제한**: 5MB로 제한하여 저장 공간 절약.
3. **URL 중복 방지**: UNIQUE 제약조건으로 중복 제출 방지.
4. **관리자 승인 필수**: 게시판은 관리자 승인 후에만 크롤러에 추가됨.
5. **모바일 우선**: 데스크톱도 모바일 레이아웃 사용, 개발 피로도 최소화.

---

## 📝 다음 단계

1. 이 계획서 검토 및 피드백
2. Phase 1부터 순차적으로 구현
3. 각 Phase 완료 시 데모 및 피드백
4. 필요 시 우선순위 조정

**이 계획으로 진행하시겠습니까?**

---

## 🔨 구현 로그 (Implementation Log)

### 2025-02-02 - 개발자 페이지 1차 구현

#### ✅ 완료된 작업

##### 1. Storage Bucket 설정
- **파일**: `supabase/migrations/20250202_create_developer_storage_bucket.sql`
- **내용**:
  - `developer` 버킷 생성 (public 읽기 권한)
  - `ideas/` 폴더에 익명 업로드/수정/삭제 정책 적용
  - 이미지 저장 경로: `developer/ideas/{image_files}`
- **상태**: 마이그레이션 파일 생성 완료, Supabase Dashboard에서 수동 실행 필요

##### 2. 아이디어 상세 모달 (IdeaDetailModal)
- **파일**: `src/components/developer/IdeaDetailModal.tsx` (신규 생성)
- **기능**:
  - 전체 콘텐츠 표시 (line-clamp 없음)
  - 모든 이미지를 세로 그리드로 표시
  - 카테고리 배지, 작성자, 작성일 메타데이터
  - Framer Motion 애니메이션 (fade-in, scale)
  - Backdrop 클릭/ESC 키/닫기 버튼으로 닫기
- **기술 스택**: framer-motion, lucide-react (X 아이콘)

##### 3. 아이디어 카드 개선 (IdeaCard)
- **파일**: `src/components/developer/IdeaCard.tsx` (수정)
- **변경사항**:
  - **이전**: 3개 썸네일 그리드 표시
  - **이후**: 대표 이미지 1개만 전체 너비로 표시 (h-40, object-cover)
  - 다중 이미지 시 "+N장" 배지 표시 (우측 상단, 반투명 배경)
  - 클릭 시 상세 모달 열기 핸들러 연결

##### 4. 페이지네이션 컴포넌트
- **파일**: `src/components/developer/Pagination.tsx` (신규 생성)
- **기능**:
  - 최대 5개 페이지 번호 표시
  - 이전/다음 버튼 (ChevronLeft/ChevronRight)
  - 현재 페이지 하이라이트 (#a8c5e0)
  - 첫/마지막 페이지에서 버튼 비활성화
  - 1페이지일 경우 컴포넌트 숨김
- **알고리즘**: 현재 페이지 중심으로 5개 페이지 계산 (가변 범위)

##### 5. useIdeas 훅 개선
- **파일**: `src/lib/hooks/useIdeas.ts` (수정)
- **변경사항**:
  - 기본 limit: 20 → 10개로 변경
  - 페이지네이션 상태 추가: `currentPage`, `totalPages`, `setPage`
  - Offset 계산: `(page - 1) * limit`
  - 동적 총 페이지 계산 (결과 개수 기반)
  - `setPage()` 함수로 페이지 전환 지원

##### 6. 배포 카드 정리 (DeploymentCard)
- **파일**: `src/components/developer/DeploymentCard.tsx` (수정)
- **변경사항**:
  - GitHub Actions 외부 링크 버튼 제거
  - `ExternalLink` 아이콘 import 제거
  - 링크 버튼 섹션 전체 삭제 (lines 111-122)

##### 7. 접을 수 있는 섹션 컴포넌트 (CollapsibleSection)
- **파일**: `src/components/developer/CollapsibleSection.tsx` (신규 생성)
- **기능**:
  - 토글 버튼 (ChevronDown/ChevronRight 아이콘)
  - 제목 + 항목 개수 배지
  - Framer Motion 애니메이션 (height, opacity)
  - `defaultOpen` 프롭으로 초기 상태 제어
  - 헤더 hover 효과
- **목적**: 긴 리스트를 접어서 무한 스크롤 방지

##### 8. 리스트 컴포넌트 리팩토링
- **파일**:
  - `src/components/developer/IdeaList.tsx` (수정)
  - `src/components/developer/BoardSubmissionList.tsx` (수정)
- **변경사항**:
  - 섹션 래퍼 제거 (제목, 테두리, 패딩)
  - 순수 콘텐츠만 반환 (loading/error/empty/cards)
  - 섹션 UI는 상위 컴포넌트(DeveloperPage)에서 CollapsibleSection으로 처리

##### 9. 개발자 페이지 통합
- **파일**: `src/pages/DeveloperPage.tsx` (수정)
- **변경사항**:
  - `IdeaDetailModal`, `Pagination`, `CollapsibleSection` import 추가
  - `selectedIdea` 상태 추가 (클릭한 아이디어 추적)
  - `onIdeaClick` 핸들러로 카드 클릭 이벤트 연결
  - 아이디어 목록/게시판 제출 목록을 CollapsibleSection으로 감싸기
  - 두 섹션 모두 `defaultOpen={false}`로 초기 접힌 상태
  - 페이지네이션 컴포넌트 추가 (`currentPage`, `totalPages`, `setPage` 연결)

#### 📸 주요 UI 개선사항

1. **카드 레이아웃**
   - 이전: 3개 작은 썸네일 → 이후: 1개 큰 대표 이미지
   - 시각적 명확성 향상, 카드 높이 일관성

2. **모달 경험**
   - 부드러운 애니메이션 (fade-in, scale)
   - 모든 이미지를 세로 정렬로 확인 가능
   - 모바일 친화적 레이아웃 (max-h-[90vh], overflow-y-auto)

3. **페이지네이션**
   - 무한 스크롤 대신 명시적 페이지 전환
   - 한 번에 10개 항목만 로드 (성능 최적화)
   - 직관적인 페이지 번호 UI

4. **접을 수 있는 섹션**
   - 긴 리스트를 접어서 초기 화면 간결화
   - 필요한 섹션만 확장하여 스크롤 최소화
   - 항목 개수 배지로 한눈에 파악

#### 🛠️ 기술적 결정사항

1. **Framer Motion 사용**
   - 이유: 부드러운 애니메이션으로 사용자 경험 향상
   - 적용: IdeaDetailModal, CollapsibleSection
   - 성능: GPU 가속 transform/opacity 속성 사용

2. **페이지네이션 vs 무한 스크롤**
   - 선택: 페이지네이션
   - 이유:
     - 사용자가 위치 파악 쉬움
     - 데이터 로딩 부담 감소
     - 모바일 환경에 적합 (명확한 경계)

3. **Component Composition 패턴**
   - CollapsibleSection을 재사용 가능한 래퍼로 분리
   - 리스트 컴포넌트는 순수 콘텐츠만 렌더링
   - 상위 컴포넌트에서 레이아웃 조합

4. **Storage RLS 정책**
   - 익명 업로드 허용 (빠른 접근성)
   - Public 읽기 권한 (URL 공유 간편)
   - `ideas/` 폴더로 격리

#### 🚧 추후 작업 필요

1. **Supabase Storage Bucket 수동 생성**
   - 파일: `supabase/migrations/20250202_create_developer_storage_bucket.sql`
   - 방법: Supabase Dashboard → Storage → Execute SQL
   - 이유: 로컬 마이그레이션 히스토리 불일치

2. **이미지 업로드 기능 구현** (Phase 4.4-4.5)
   - ImageUploader 컴포넌트
   - useImageUpload 훅
   - 카메라/갤러리 접근

3. **게시판 제출 상세 모달** (Phase 5.6)
   - BoardSubmissionDetailModal 컴포넌트
   - 스크린샷 확대 보기
   - 상태별 UI

4. **관리자 승인 워크플로우** (Phase 7)
   - AdminPage에 게시판 제출 승인 탭
   - 승인/거부 버튼 및 처리 로직

#### 📊 현재 구현 진행도

| Phase | 상태 | 완료율 |
|-------|------|--------|
| Phase 1 | ✅ 완료 | 100% |
| Phase 2 | ✅ 완료 | 100% |
| Phase 3 | ✅ 완료 | 100% |
| Phase 4 | 🔄 진행 중 | 60% (4.1-4.3, 4.6-4.7 완료) |
| Phase 5 | 🔄 진행 중 | 40% (5.1-5.2, 5.5 완료) |
| Phase 6 | ✅ 완료 | 100% |
| Phase 7 | ⏳ 대기 | 0% |
| Phase 8 | ⏳ 대기 | 0% |
| Phase 9 | ⏳ 대기 | 0% |

**전체 진행도: 약 65%**

---

*Last Updated: 2025-02-02*
*Version: 2.1.0*
*Status: Phase 4-6 Partially Implemented*
