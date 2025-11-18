# RLS 비활성화 방법

## Supabase Dashboard에서 직접 실행

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: qpwnsvsiduvvqdijyxio
3. 좌측 메뉴 > SQL Editor 클릭
4. 아래 SQL 실행:

```sql
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;
```

5. 실행 후 확인:

```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'bookmarks';
```

`relrowsecurity`가 `false`여야 함.

## 왜 로컬 스크립트는 되고 브라우저는 안 되는가?

- 로컬 스크립트: ANON_KEY로 인증 없이 접근 → RLS 통과
- 브라우저: Google OAuth 세션으로 접근 → RLS가 auth.uid() 체크 → 막힘

브라우저 콘솔 로그:
```
sessionExists: true
rawBookmarks: []  ← RLS가 막음
```

로컬 스크립트:
```
세션: 없음
결과: 6개  ← RLS 통과
```
