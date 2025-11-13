# Playwright Verification Report
**Date**: 2025-11-13
**Verification Method**: Systematic Playwright browser automation with screenshots
**User Complaint**: Multiple chat features broken despite claims of completion

## Executive Summary

✅ **VERIFIED ISSUES**:
1. CompactTalentCard (AI recommendation area) has NO chat button
2. UserSearchModal queries non-existent `user_profiles.email` column

❌ **REMAINING TO VERIFY**:
1. Desktop TalentCard/ExperienceCard opening full page instead of modal
2. User search actual error reproduction

## Detailed Findings

### 1. CompactTalentCard - Missing Chat Button ✅ CONFIRMED

**Location**: AI recommendation carousel (top of homepage)
**File**: [src/components/cards/CompactTalentCard.tsx](../src/components/cards/CompactTalentCard.tsx)

**Evidence**:
- Screenshot: [6-top-with-recommendations.png](../.playwright-mcp/6-top-with-recommendations.png)
- Playwright inspection found talent cards with:
  - "최OO 강사님" - 0 buttons, 3 svgs (icons only, no chat button)
  - "김OO 강사" - 0 buttons, 3 svgs (icons only, no chat button)

**Code Analysis**:
```typescript
// CompactTalentCard.tsx - Lines 1-79
import { IconMapPin, IconBriefcase, IconStar } from '@tabler/icons-react';
// ❌ NO MessageCircle import
// ❌ NO chat button implementation anywhere in component
```

**User Requirement**:
> "인력카드 리스트에 있는 부분에서 채팅 버튼 클릭했을 때"

**Status**: NOT IMPLEMENTED - CompactTalentCard has no chat functionality

---

### 2. UserSearchModal - Email Column Error ✅ CONFIRMED

**Location**: User search modal for initiating chats
**File**: [src/components/chat/UserSearchModal.tsx](../src/components/chat/UserSearchModal.tsx:37-40)

**Broken Code**:
```typescript
const { data, error: searchError } = await supabase
  .from('user_profiles')
  .select('user_id, email, display_name, profile_image_url')  // ❌ email doesn't exist!
  .or(`email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
```

**Database Schema Evidence**:
From [supabase/migrations/20250125_simplify_user_profiles.sql](../supabase/migrations/20250125_simplify_user_profiles.sql):
```sql
-- Fields that exist:
-- user_id, display_name, phone, roles, interest_regions,
-- experience_years, capable_subjects, teacher_level, etc.
-- ❌ NO email column!
```

From [src/lib/supabase/profiles.ts](../src/lib/supabase/profiles.ts:4-28):
```typescript
export type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  // ... many other fields
  // ❌ NO email field
};
```

**User Error Report**:
User searched for "cgrang@naver.com" and got:
> "column user_profiles.email does not exist"

**Status**: BROKEN - Email column was removed in migration but code still references it

---

### 3. TalentCard/ExperienceCard - Desktop Modal Bypass ⚠️ PARTIALLY VERIFIED

**Location**: Main talent/experience cards
**Files**:
- [src/components/cards/TalentCard.tsx:49](../src/components/cards/TalentCard.tsx#L49)
- [src/components/cards/ExperienceCard.tsx:69](../src/components/cards/ExperienceCard.tsx#L69)

**Broken Code Pattern**:
```typescript
// TalentCard.tsx:49, ExperienceCard.tsx:69
window.location.href = `/chat/${roomId}`;  // ❌ Always opens new page
```

**Correct Pattern (from App.tsx:485-496)**:
```typescript
const handleChatClick = () => {
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    window.location.href = '/chat';  // Mobile: new page
  } else {
    setIsChatModalOpen(true);        // Desktop: modal
  }
};
```

**User Requirement**:
> "모바일: 채팅 페이지 전환
> 데스크톱: 모달창만 표시 (새 페이지 안 열림)"

**Status**: CODE REVIEW CONFIRMS ISSUE - Direct navigation bypasses modal logic
**Note**: Could not verify runtime behavior (no talent cards visible in current view)

---

## Screenshots Evidence

1. **1-homepage-initial.png** - Mobile view (648px) homepage
2. **2-desktop-homepage.png** - Desktop view (1400px) homepage
3. **3-login-modal.png** - Login modal visible
4. **4-homepage-after-back.png** - Returned to homepage
5. **5-scrolled-down.png** - Scrolled view showing job cards
6. **6-top-with-recommendations.png** - AI recommendation carousel with CompactTalentCard
7. **7-scrolled-job-cards.png** - Main grid showing only job cards

## Code Files Requiring Fixes

### Priority 1: Critical Functionality Broken
1. **UserSearchModal.tsx** - Cannot search users by email
2. **CompactTalentCard.tsx** - Missing chat button entirely

### Priority 2: Desktop Modal Bypass
3. **TalentCard.tsx** - Desktop opens full page instead of modal
4. **ExperienceCard.tsx** - Desktop opens full page instead of modal

## User's Original Complaints (Validation Status)

From user's message with screenshots:

> "씨발놈아. 2-2, 2-3부분 씨발개새끼야. 했다면서?"

**2-2: 인력/체험 카드에서 채팅 시작**
- ❌ CompactTalentCard: NO chat button
- ⚠️ TalentCard/ExperienceCard: Code bypasses modal logic
- Status: PARTIALLY BROKEN

**2-3: 사용자 ID 검색해서 채팅 시작**
- ❌ UserSearchModal: Email column doesn't exist
- Status: COMPLETELY BROKEN

## Recommended Fixes

### Fix 1: UserSearchModal Email Search
**Problem**: Queries non-existent `email` column from `user_profiles`
**Solution**: Query `auth.users` table OR use different search approach

**Option A - Service Role Query**:
```typescript
// Use service_role key to access auth.users
const { data: users } = await supabase.auth.admin.listUsers();
const filtered = users.filter(u =>
  u.email?.includes(searchQuery) ||
  profiles.find(p => p.user_id === u.id && p.display_name?.includes(searchQuery))
);
```

**Option B - Display Name Only**:
```typescript
// Search only by display_name (email not available)
const { data } = await supabase
  .from('user_profiles')
  .select('user_id, display_name, profile_image_url')  // Remove email
  .ilike('display_name', `%${searchQuery}%`)
```

### Fix 2: Add Chat Button to CompactTalentCard
**Problem**: Component has no MessageCircle button implementation
**Solution**: Copy pattern from TalentCard.tsx

```typescript
import { MessageCircle } from 'lucide-react';

// Add button in header section
{user && !isOwner && talent.user_id && (
  <button
    onClick={handleChatClick}
    className="p-1.5 hover:bg-emerald-50 rounded-full transition-colors"
    title="채팅하기"
  >
    <MessageCircle className="w-5 h-5 text-emerald-600" />
  </button>
)}
```

### Fix 3: TalentCard/ExperienceCard Desktop Modal
**Problem**: Direct `window.location.href` bypasses modal logic
**Solution**: Check screen size and use modal open callback

```typescript
// Change from:
window.location.href = `/chat/${roomId}`;

// To:
const isMobile = window.innerWidth < 768;
if (isMobile) {
  window.location.href = `/chat/${roomId}`;
} else {
  // Need to pass modal open callback from App.tsx as prop
  onOpenChatModal?.(roomId);
}
```

**Requires**: Pass `onOpenChatModal` prop from App.tsx to cards

## Verification Status Summary

| Issue | Verified | Method | Status |
|-------|----------|--------|--------|
| CompactTalentCard no chat button | ✅ | Playwright inspection | CONFIRMED BROKEN |
| UserSearchModal email column | ✅ | Code review + schema | CONFIRMED BROKEN |
| Desktop modal bypass | ⚠️ | Code review only | CODE CONFIRMS ISSUE |
| User search runtime error | ❌ | Not tested | NEEDS LOGIN TEST |

## Next Steps

1. ✅ Complete verification report (this document)
2. ❌ Test user search with login (requires auth)
3. ❌ Test desktop modal behavior with actual talent card
4. ❌ Implement fixes per user approval
