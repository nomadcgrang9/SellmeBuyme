# 개발자노트 댓글/대댓글 시스템 설계

## 📋 개요

아이디어, 공고게시판, 프로젝트에 댓글/대댓글 기능을 추가하여 팀원들이 자유롭게 의견을 나눌 수 있도록 구현합니다.

## 🗂️ 데이터 구조

### 1. 댓글 테이블 (dev_comments)

```sql
CREATE TABLE public.dev_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 관계 정보
  parent_id uuid REFERENCES public.dev_comments(id) ON DELETE CASCADE,  -- 대댓글 시 부모 댓글 ID
  target_type text NOT NULL CHECK (target_type IN ('idea', 'submission', 'project')),
  target_id uuid NOT NULL,  -- 아이디어/게시판/프로젝트 ID
  
  -- 작성자 정보
  author_name text NOT NULL,  -- 익명 사용자 이름
  author_ip_hash text NOT NULL,  -- IP 해시 (중복 방지)
  
  -- 댓글 내용
  content text NOT NULL,
  
  -- 메타데이터
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- 인덱스
  CONSTRAINT valid_target_id CHECK (target_id IS NOT NULL)
);

-- 인덱스
CREATE INDEX idx_dev_comments_target ON public.dev_comments(target_type, target_id);
CREATE INDEX idx_dev_comments_parent ON public.dev_comments(parent_id);
CREATE INDEX idx_dev_comments_author_ip ON public.dev_comments(author_ip_hash);
CREATE INDEX idx_dev_comments_created_at ON public.dev_comments(created_at DESC);
```

### 2. IP 저장소 테이블 (dev_comment_authors)

```sql
CREATE TABLE public.dev_comment_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- IP 정보
  ip_hash text NOT NULL UNIQUE,  -- SHA256 해시
  
  -- 작성자 정보
  author_name text NOT NULL,
  
  -- 메타데이터
  first_used_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  comment_count int NOT NULL DEFAULT 0
);

-- 인덱스
CREATE INDEX idx_dev_comment_authors_ip_hash ON public.dev_comment_authors(ip_hash);
```

## 🔐 RLS 정책

### dev_comments 테이블

```sql
-- 모든 사용자가 댓글 조회 가능
CREATE POLICY "Comments are viewable by everyone"
  ON public.dev_comments FOR SELECT
  USING (true);

-- 인증되지 않은 사용자도 댓글 작성 가능 (IP 기반)
CREATE POLICY "Anyone can insert comments"
  ON public.dev_comments FOR INSERT
  WITH CHECK (true);

-- 작성자만 수정 가능 (IP 해시 기반)
CREATE POLICY "Users can update own comments"
  ON public.dev_comments FOR UPDATE
  USING (author_ip_hash = public.get_client_ip_hash())
  WITH CHECK (author_ip_hash = public.get_client_ip_hash());

-- 작성자만 삭제 가능
CREATE POLICY "Users can delete own comments"
  ON public.dev_comments FOR DELETE
  USING (author_ip_hash = public.get_client_ip_hash());
```

### dev_comment_authors 테이블

```sql
-- 모든 사용자가 조회 가능
CREATE POLICY "Authors are viewable by everyone"
  ON public.dev_comment_authors FOR SELECT
  USING (true);

-- 시스템만 삽입/수정 가능
CREATE POLICY "System can manage authors"
  ON public.dev_comment_authors FOR INSERT
  WITH CHECK (true);
```

## 🔧 Helper 함수

### IP 해시 생성 함수

```sql
CREATE OR REPLACE FUNCTION public.get_client_ip_hash()
RETURNS text AS $$
BEGIN
  -- 클라이언트 IP를 SHA256으로 해시
  -- 실제 IP는 프론트엔드에서 전달
  RETURN current_setting('app.client_ip_hash', true);
END;
$$ LANGUAGE plpgsql;
```

## 📱 프론트엔드 구조

### 1. 타입 정의 (types/developer.ts)

```typescript
// 댓글 타입
export interface DevComment {
  id: string;
  parentId: string | null;  // 대댓글이면 부모 댓글 ID
  targetType: 'idea' | 'submission' | 'project';
  targetId: string;
  authorName: string;
  authorIpHash: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  replies?: DevComment[];  // 대댓글 목록
}

// 댓글 작성 폼 데이터
export interface CommentFormData {
  content: string;
  authorName?: string;  // 첫 작성 시만 필요
}

// IP 저장소
export interface CommentAuthor {
  id: string;
  ipHash: string;
  authorName: string;
  firstUsedAt: string;
  lastUsedAt: string;
  commentCount: number;
}
```

### 2. Supabase 쿼리 함수 (lib/supabase/developer.ts)

```typescript
// 댓글 생성
export async function createComment(
  targetType: 'idea' | 'submission' | 'project',
  targetId: string,
  content: string,
  authorName: string,
  parentId?: string
): Promise<DevComment>

// 댓글 목록 조회
export async function getComments(
  targetType: 'idea' | 'submission' | 'project',
  targetId: string
): Promise<DevComment[]>

// 댓글 수정
export async function updateComment(
  commentId: string,
  content: string
): Promise<DevComment>

// 댓글 삭제
export async function deleteComment(commentId: string): Promise<void>

// IP 저장소 조회
export async function getCommentAuthorByIp(ipHash: string): Promise<CommentAuthor | null>

// IP 저장소 생성/업데이트
export async function upsertCommentAuthor(
  ipHash: string,
  authorName: string
): Promise<CommentAuthor>
```

### 3. 커스텀 훅 (lib/hooks/useComments.ts)

```typescript
export function useComments(
  targetType: 'idea' | 'submission' | 'project',
  targetId: string
) {
  const [comments, setComments] = useState<DevComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [authorName, setAuthorName] = useState<string>('');

  // 댓글 로드
  const loadComments = async () => { ... }

  // 댓글 작성
  const addComment = async (content: string, parentId?: string) => { ... }

  // 댓글 수정
  const editComment = async (commentId: string, content: string) => { ... }

  // 댓글 삭제
  const removeComment = async (commentId: string) => { ... }

  // 작성자 이름 저장 (localStorage + IP 저장소)
  const saveAuthorName = async (name: string) => { ... }

  return {
    comments,
    loading,
    error,
    authorName,
    loadComments,
    addComment,
    editComment,
    removeComment,
    saveAuthorName,
  };
}
```

### 4. 컴포넌트 구조

#### CommentSection.tsx (댓글 섹션)

```typescript
interface CommentSectionProps {
  targetType: 'idea' | 'submission' | 'project';
  targetId: string;
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const {
    comments,
    loading,
    authorName,
    addComment,
    editComment,
    removeComment,
    saveAuthorName,
  } = useComments(targetType, targetId);

  return (
    <div className="mt-6 border-t pt-4">
      {/* 댓글 작성 폼 */}
      <CommentForm
        authorName={authorName}
        onSubmit={addComment}
        onSaveAuthor={saveAuthorName}
      />

      {/* 댓글 목록 */}
      <CommentList
        comments={comments}
        onEdit={editComment}
        onDelete={removeComment}
        onReply={addComment}
      />
    </div>
  );
}
```

#### CommentForm.tsx (댓글 작성 폼)

```typescript
interface CommentFormProps {
  authorName: string;
  parentId?: string;  // 대댓글 시
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  onSaveAuthor: (name: string) => Promise<void>;
}

export function CommentForm({
  authorName,
  parentId,
  onSubmit,
  onSaveAuthor,
}: CommentFormProps) {
  const [showNameInput, setShowNameInput] = useState(!authorName);
  const [name, setName] = useState(authorName);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    // 첫 작성이면 이름 저장
    if (showNameInput && name.trim()) {
      await onSaveAuthor(name);
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content, parentId);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 mb-4">
      {/* 이름 입력 (첫 작성 시만) */}
      {showNameInput && (
        <input
          type="text"
          placeholder="이름을 입력해주세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      )}

      {/* 댓글 내용 입력 */}
      <textarea
        placeholder={parentId ? '대댓글을 입력해주세요' : '댓글을 입력해주세요'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
        rows={3}
      />

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !content.trim()}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
      >
        {isSubmitting ? '작성 중...' : '댓글 작성'}
      </button>
    </div>
  );
}
```

#### CommentList.tsx (댓글 목록)

```typescript
interface CommentListProps {
  comments: DevComment[];
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId: string) => Promise<void>;
}

export function CommentList({
  comments,
  onEdit,
  onDelete,
  onReply,
}: CommentListProps) {
  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onEdit={onEdit}
          onDelete={onDelete}
          onReply={onReply}
        />
      ))}
    </div>
  );
}
```

#### CommentItem.tsx (개별 댓글)

```typescript
interface CommentItemProps {
  comment: DevComment;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (content: string, parentId: string) => Promise<void>;
}

export function CommentItem({
  comment,
  onEdit,
  onDelete,
  onReply,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className={`${comment.parentId ? 'ml-6' : ''} p-3 bg-gray-50 rounded-lg`}>
      {/* 작성자 정보 */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{comment.authorName}</span>
        <span className="text-xs text-gray-500">
          {formatTimeAgo(comment.createdAt)}
        </span>
      </div>

      {/* 댓글 내용 */}
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
          rows={2}
        />
      ) : (
        <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2 text-xs">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                onEdit(comment.id, editContent);
                setIsEditing(false);
              }}
              className="text-blue-500 hover:underline"
            >
              저장
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-500 hover:underline"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-500 hover:underline"
            >
              수정
            </button>
            <button
              onClick={() => onDelete(comment.id)}
              className="text-red-500 hover:underline"
            >
              삭제
            </button>
          </>
        )}
        {!comment.parentId && (
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-gray-500 hover:underline"
          >
            대댓글
          </button>
        )}
      </div>

      {/* 대댓글 목록 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}

      {/* 대댓글 작성 폼 */}
      {showReplyForm && !comment.parentId && (
        <CommentForm
          authorName=""
          parentId={comment.id}
          onSubmit={(content) => {
            onReply(content, comment.id);
            setShowReplyForm(false);
          }}
          onSaveAuthor={() => {}}
        />
      )}
    </div>
  );
}
```

## 🔒 IP 기반 작성자 식별 시스템

### 프론트엔드 로직

```typescript
// 1. 클라이언트 IP 해시 생성
async function getClientIpHash(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    const ip = data.ip;

    // SHA256 해시 생성
    const buffer = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    console.error('Failed to get IP hash:', error);
    return '';
  }
}

// 2. localStorage에 저장된 작성자 이름 조회
function getSavedAuthorName(): string | null {
  return localStorage.getItem('dev_comment_author_name');
}

// 3. 작성자 이름 저장
function saveAuthorName(name: string): void {
  localStorage.setItem('dev_comment_author_name', name);
}

// 4. 댓글 작성 시 작성자 정보 자동 입력
async function initializeCommentForm() {
  const savedName = getSavedAuthorName();
  const ipHash = await getClientIpHash();

  if (savedName) {
    // 이미 저장된 이름이 있으면 자동 입력
    setAuthorName(savedName);
    setShowNameInput(false);
  } else {
    // 처음이면 이름 입력 요청
    setShowNameInput(true);
  }
}
```

## 📊 구현 순서

### Phase 1: 데이터베이스
1. `dev_comments` 테이블 생성
2. `dev_comment_authors` 테이블 생성
3. RLS 정책 설정
4. Helper 함수 생성

### Phase 2: 백엔드 쿼리
1. Supabase 쿼리 함수 작성
2. IP 해시 기반 작성자 식별
3. 댓글 CRUD 구현

### Phase 3: 프론트엔드 기본
1. 타입 정의
2. 커스텀 훅 작성
3. 컴포넌트 구현

### Phase 4: 프론트엔드 통합
1. IdeaCard에 CommentSection 추가
2. BoardSubmissionCard에 CommentSection 추가
3. ProjectCard에 CommentSection 추가

### Phase 5: 테스트 및 최적화
1. 댓글 작성/수정/삭제 테스트
2. 대댓글 기능 테스트
3. IP 기반 작성자 식별 테스트
4. 성능 최적화

## 🎯 주요 특징

✅ **익명 댓글**: 로그인 불필요, IP 기반 식별
✅ **대댓글 지원**: 계층적 댓글 구조
✅ **자동 이름 입력**: 첫 작성 후 같은 IP에서는 자동 입력
✅ **수정/삭제**: IP 해시로 작성자 확인 후 허용
✅ **실시간 업데이트**: 댓글 작성 후 즉시 표시

---

**마지막 업데이트**: 2025-11-02
