# Scripts Directory

이 폴더에는 TypeScript로 작성된 관리/검증 스크립트들이 있습니다.

## 📁 구조

```
scripts/
├── db/              # 데이터베이스 관리 스크립트
│   ├── grant-admin-role.ts      # 관리자 권한 부여
│   ├── check-keywords.ts        # 키워드 테이블 확인
│   ├── apply-migration.ts       # 마이그레이션 적용 (히스토리 포함)
│   └── run-migration.ts         # 마이그레이션 실행
└── test/            # 검증/테스트 스크립트
    └── verify-stripe-banners.ts # 띠지배너 시스템 검증
```

## 🚀 사용 방법

### 직접 실행 (tsx 사용)

```bash
# 띠지배너 시스템 검증
npx tsx scripts/test/verify-stripe-banners.ts

# 키워드 테이블 확인
npx tsx scripts/db/check-keywords.ts

# 관리자 권한 부여
npx tsx scripts/db/grant-admin-role.ts <user-id>

# 마이그레이션 적용 (히스토리 등록 포함)
npx tsx scripts/db/apply-migration.ts

# 마이그레이션 실행 (간단 버전)
npx tsx scripts/db/run-migration.ts
```

### npm scripts 사용 (권장)

```bash
# 띠지배너 시스템 검증
npm run verify:banners

# 키워드 테이블 확인
npm run db:check-keywords

# 관리자 권한 부여
npm run db:grant-admin <user-id>

# 마이그레이션 적용 (히스토리 등록 포함)
npm run db:apply-migration

# 마이그레이션 실행 (간단 버전)
npm run db:run-migration
```

## 📝 새 스크립트 추가 방법

1. **TypeScript 파일 생성**
   ```bash
   # DB 관리 스크립트
   touch scripts/db/your-script.ts

   # 테스트 스크립트
   touch scripts/test/your-test.ts
   ```

2. **스크립트 작성**
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-url';
   const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-key';

   const supabase = createClient(supabaseUrl, supabaseKey);

   async function yourFunction(): Promise<void> {
     // Your code here
   }

   yourFunction().catch(console.error);
   ```

3. **package.json에 스크립트 추가** (선택사항)
   ```json
   {
     "scripts": {
       "your:script": "tsx scripts/db/your-script.ts"
     }
   }
   ```

## ⚠️ 중요

- **TypeScript만 사용**: 모든 스크립트는 `.ts` 파일이어야 합니다
- **.mjs/.js 금지**: JavaScript 파일은 `crawler/` 폴더에서만 허용됩니다
- **PROJECT_RULES.md 준수**: "Type-Safe" 원칙을 따릅니다

## 🔐 환경 변수

스크립트는 `.env` 파일의 환경 변수를 사용합니다:

### Supabase 클라이언트 (일반 스크립트)
- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY`: 익명 키 (읽기 작업)
- `SUPABASE_SERVICE_ROLE_KEY`: 서비스 롤 키 (관리자 작업)

### PostgreSQL 직접 연결 (마이그레이션 스크립트)
- `SUPABASE_DB_HOST`: 데이터베이스 호스트 (기본값: aws-0-ap-northeast-2.pooler.supabase.com)
- `SUPABASE_DB_PORT`: 데이터베이스 포트 (기본값: 6543)
- `SUPABASE_DB_NAME`: 데이터베이스 이름 (기본값: postgres)
- `SUPABASE_DB_USER`: 데이터베이스 사용자
- `SUPABASE_DB_PASSWORD`: 데이터베이스 비밀번호
- `SUPABASE_CONNECTION_STRING`: PostgreSQL 연결 문자열 (전체 URL)

## 📚 참고 문서

- [CLAUDE.md](../CLAUDE.md) - 프로젝트 가이드
- [PROJECT_RULES.md](../PROJECT_RULES.md) - 프로젝트 규칙
