# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SellmeBuyme (셀미바이미)** is an educational job posting aggregation platform that connects schools with teachers and instructors. The platform uses AI-powered recommendations to match job postings with users based on their profiles.

## Core Architecture

### Frontend (Vite + React)
- **Framework**: Vite + React 18 (client-only, no SSR)
- **State Management**: Zustand stores (`authStore`, `searchStore`, `toastStore`)
- **Database**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Styling**: Tailwind CSS with custom color palette
- **Deployment**: Cloudflare Pages

### Backend Systems
1. **Supabase Database**: PostgreSQL with RLS policies
2. **Edge Functions**: Deno-based serverless functions (e.g., `profile-recommendations`, `download-attachment`)
3. **Crawler**: Node.js-based web scraper using Playwright and Gemini AI for data extraction

### Key Data Flow
```
Crawler (Node.js + Playwright + Gemini)
    ↓
Supabase Database (job_postings, talents, user_profiles)
    ↓
Frontend (Vite + React) ← Edge Functions (AI recommendations)
```

## Project Structure

```
.
├── src/
│   ├── components/
│   │   ├── ai/              # AI recommendation components
│   │   ├── auth/            # Authentication & profile modals
│   │   ├── cards/           # Job & talent card components
│   │   ├── layout/          # Header, banners
│   │   └── admin/           # Admin management tools
│   ├── lib/
│   │   ├── supabase/        # Supabase client & queries
│   │   ├── constants/       # Filter options, constants
│   │   └── hooks/           # Custom React hooks
│   ├── stores/              # Zustand state stores
│   └── types/               # TypeScript type definitions
├── scripts/                 # TypeScript admin/verification scripts
│   ├── db/                  # Database management scripts (.ts)
│   └── test/                # Test/verification scripts (.ts)
├── crawler/
│   ├── sources/             # Site-specific crawlers (.js - exception)
│   ├── lib/                 # Crawler utilities (.js - exception)
│   └── index.js             # Main crawler orchestrator
├── supabase/
│   ├── migrations/          # Database schema migrations (.sql)
│   └── functions/           # Edge Functions (Deno TypeScript)
└── public/fonts/            # esamanru Korean fonts
```

## Development Commands

### Frontend Development
```bash
npm run dev          # Start Vite dev server (default: http://localhost:5173)
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Crawler Operations
```bash
cd crawler
node index.js        # Run crawler for all configured boards
node test-uijeongbu.js  # Test specific crawler
```

### Supabase
```bash
# Deploy Edge Functions
supabase functions deploy profile-recommendations
supabase functions deploy download-attachment
```

## Key Technical Decisions

### 1. Path Aliases
- Uses `@/` prefix for `src/` imports
- Configured in `tsconfig.json` and `vite.config.ts`

### 2. Environment Variables
- Vite requires `VITE_` prefix for browser-exposed variables
- **Client-side**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Server-side** (Edge Functions): `PROJECT_URL`, `ANON_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 3. Authentication Flow
- Supabase Auth with Google OAuth
- Profile setup modal triggers for new users after OAuth callback
- Profile data stored in `user_profiles` table with RLS policies
- Auth state managed by `authStore.ts` (Zustand)

### 4. Search Architecture
- **Token Groups**: Search queries are expanded into synonym groups (e.g., "중등" → ["중등", "중학교", "고등학교"])
- **Dual Search**: Uses both PostgreSQL FTS (full-text search) and ILIKE for flexible matching
- **Post-filtering**: `filterJobsByTokenGroups()` ensures all token groups match at least once
- Search state managed by `searchStore.ts`

### 5. AI Recommendations
- **Profile-based**: Edge Function `profile-recommendations` generates personalized recommendations
- **Caching**: Results cached in `recommendations_cache` table (24-hour validity)
- **Scoring System**: Multi-factor scoring based on:
  - Location proximity (preferred regions + adjacent areas)
  - Role matching (teacher, instructor, etc.)
  - Subject compatibility (`capable_subjects` field)
  - Experience years
  - Recency and urgency
- **Gemini AI Filtering**: Optional AI-based refinement of top 20 candidates

### 6. Crawler Design
- **Gemini Vision API**: Used to extract structured data from job posting screenshots
- **Deduplication**: Uses `source_url` as unique key; updates existing records
- **Attachment Handling**: Downloads routed through Edge Function for proper filename handling
- **Token Tracking**: Monitors Gemini API usage per session
- **Batch Size**: Configurable via `crawl_boards.crawl_batch_size` (default: 10)

## Important Database Tables

### `job_postings`
- Core job posting data
- Fields: `organization`, `title`, `tags`, `location`, `compensation`, `deadline`, `is_urgent`, `school_level`, `subject`, `required_license`, `structured_content` (JSONB)
- RLS: Public read, authenticated insert/update own records

### `user_profiles`
- Extended user data beyond Supabase Auth
- Fields: `display_name`, `roles`, `interest_regions`, `experience_years`, `teacher_level`, `capable_subjects`, `preferred_job_types`, `preferred_subjects`
- RLS: Users can only read/update their own profile

### `recommendations_cache`
- Stores pre-computed AI recommendations
- Fields: `user_id` (PK), `cards` (JSONB), `ai_comment` (JSONB), `profile_snapshot` (JSONB)
- Auto-invalidated after 24 hours or profile changes

### `talents`
- Instructor/talent pool listings
- Fields: `name`, `specialty`, `tags`, `location[]`, `experience_years`, `rating`, `review_count`, `is_verified`

### `crawl_boards`
- Crawler source configuration
- Fields: `board_name`, `base_url`, `last_crawled_at`, `crawl_batch_size`

## Color System

The app uses a custom color palette defined in `tailwind.config.ts`:

- **Primary (Job postings)**: `#a8c5e0` → Shades of `#7aa3cc`, `#8fb4d6`
- **Talent Pool**: `#c5e3d8` → Highlights of `#7db8a3`, `#6fb59b`
- **Experience (future)**: `#ffd98e` → `#f4c96b`
- **Backgrounds**: Various gradients from these base colors

## Critical Patterns

### 1. Modal State Management
- Profile setup/edit: `ProfileSetupModal` with create/edit modes
- State lifted to `App.tsx` with `isEditMode` flag
- Always clear modal state on close: `setEditMode(false)`, `setProfileInitialData(null)`

### 2. File Uploads (Supabase Storage)
- Bucket: `profiles` for profile images
- Path pattern: `{user_id}/profile.{ext}`
- RLS: Authenticated users can upload/delete own files
- Store public URL in `user_profiles.profile_image_url`

### 3. Infinite Scroll
- Uses `IntersectionObserver` in `App.tsx`
- Sentinel div at bottom of card grid
- Triggers `loadMore()` from `searchStore`
- Handles loading states separately for initial load vs. pagination

### 4. Card Components
- Two sizes: `JobCard`/`TalentCard` (main grid) and `CompactJobCard`/`CompactTalentCard` (AI recommendations)
- Both use same data structure, differ in layout constraints
- Hover expansion: Absolute positioned slide-out with action buttons
- Top banner gradient: 0.5px height, color-coded by type

### 5. Crawler Error Handling
- Skip existing records if no attachment update needed
- Log errors to `crawl_boards.error_count`
- Gemini API calls wrapped with token tracking
- Screenshot analysis before detailed parsing

### 6. Development Scripts (TypeScript Only)
- **Language Policy**: All scripts must be TypeScript (.ts) files (PROJECT_RULES.md)
- **Execution**: Use `tsx` or `ts-node`: `npx tsx scripts/your-script.ts`
- **Location**: `scripts/` directory (not root)
- **Crawler Exception**: Only `crawler/` directory can use Python (.py) and Node.js (.js)
- **No .mjs/.js**: JavaScript files are NOT allowed outside `crawler/`
- **Type Safety**: All scripts benefit from TypeScript type checking

## Common Workflows

### Adding a New Crawler Source
1. Create `crawler/sources/{source-name}.js` exporting `crawl{SourceName}()` function
2. Import and add to `ACTIVE_SOURCES` array in `crawler/index.js`
3. Insert row into `crawl_boards` table via Supabase dashboard
4. Test with dedicated test file (e.g., `test-{source}.js`)

### Modifying User Profile Schema
1. Create migration SQL in `supabase/migrations/`
2. Update `UserProfileRow` type in `src/lib/supabase/profiles.ts`
3. Update `upsertUserProfile()` to include new fields
4. Modify `ProfileSetupModal` steps to collect new data
5. Update `profile-recommendations` Edge Function if it affects scoring

### Adding a New Edge Function
1. Create directory: `supabase/functions/{function-name}/index.ts`
2. Configure CORS headers and authentication check
3. Deploy: `supabase functions deploy {function-name}`
4. Set secrets if needed: `supabase secrets set KEY=value`
5. Invoke from frontend: `supabase.functions.invoke('{function-name}')`

### Debugging Search Issues
- Check `searchStore` state in React DevTools
- Verify token expansion in `queries.ts:buildSearchTokens()`
- Test FTS query in Supabase SQL editor
- Check post-filtering logic in `filterJobsByTokenGroups()`
- Review search logs in `search_logs` table

### Writing Verification Scripts
1. **TypeScript Only**: Create `.ts` files in `scripts/` directory
2. Run with `tsx`: `npx tsx scripts/verify-db.ts`
3. **Never use .mjs or .js files** - TypeScript only (see PROJECT_RULES.md)
4. Example structure:
   ```
   scripts/
   ├── db/
   │   ├── verify-migration.ts
   │   ├── grant-admin-role.ts
   │   └── verify-keywords.ts
   └── test/
       └── verify-phase3.ts
   ```
5. **Crawler Exception**: Only `crawler/` directory can use Python (.py) and Node.js (.js)

## Testing Considerations

- **Crawler**: Use individual test files (e.g., `test-gyeonggi-full.js`) to validate parsing without hitting DB
- **Authentication**: Test OAuth flow in incognito window to avoid cached sessions
- **Recommendations**: Clear `recommendations_cache` row to force regeneration
- **RLS Policies**: Test with different user contexts (anon, authenticated, admin)

## Performance Notes

- **FTS Indexes**: `pg_trgm` GIN indexes on searchable text columns (`job_postings.title`, `job_postings.organization`, etc.)
- **Query Limits**: Default 12 results per page, configurable via `searchStore.limit`
- **Recommendation Caching**: 24-hour cache prevents repeated Edge Function calls
- **Crawler Throttling**: Rate-limited to avoid overwhelming education board servers

## Known Constraints

- **Crawler Reliability**: Some education boards use non-standard pagination or require JS rendering
- **Gemini API Costs**: Vision API calls can be expensive; token tracking helps monitor usage
- **RLS Complexity**: Some queries require `service_role` key to bypass RLS (use sparingly)
- **Attachment Downloads**: Original URLs may expire; Edge Function proxy provides stability
- **Language Policy**: TypeScript-only project (except `crawler/` which uses Python/Node.js)
- **.mjs files**: Any existing .mjs files should be migrated to TypeScript (.ts) or removed

## References

- **Architecture docs**: `BACKEND_STRUCTURE.md`, `FRONTEND_STRUCTURE.md`
- **Color system**: `COLOR_STRUCTURE.md`
- **Crawling plan**: `CRAWLING_PLAN.md`
- **Search redesign**: `SEARCH_SYSTEM_REDESIGN.md`
- **Recent changes**: Check git log for detailed change history
