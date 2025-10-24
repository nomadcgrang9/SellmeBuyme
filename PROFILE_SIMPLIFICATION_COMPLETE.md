# Profile Schema Simplification - Implementation Complete

**Date**: 2025-01-25  
**Status**: ✅ Implementation Complete - Ready for Testing

---

## 📋 Overview

Simplified the user profile schema by removing unnecessary "preferred" fields and focusing on "capable" fields. This change makes the profile more accurate by asking "What can you teach?" instead of "What do you prefer?"

---

## ✅ Completed Changes

### 1. Database Migration
**File**: `supabase/migrations/20250125_simplify_user_profiles.sql`

**Changes**:
- ✅ Added `capable_subjects` field (replaces `preferred_subjects`)
- ✅ Migrated existing `preferred_subjects` data to `capable_subjects`
- ✅ Removed `primary_region` field
- ✅ Removed `preferred_job_types` field
- ✅ Removed `preferred_subjects` field
- ✅ Added indexes for performance

**Schema Changes**:
```sql
-- Added
capable_subjects TEXT[]  -- What subjects can you teach?

-- Removed
primary_region TEXT      -- Redundant with interest_regions
preferred_job_types TEXT[]  -- Not meaningful for filtering
preferred_subjects TEXT[]   -- Replaced by capable_subjects
```

---

### 2. Backend Types
**File**: `src/lib/supabase/profiles.ts`

**Changes**:
- ✅ Updated `UserProfileRow` type
- ✅ Updated `ProfileUpsertInput` type
- ✅ Updated `upsertUserProfile()` function
- ✅ Removed all references to removed fields

**Key Type Changes**:
```typescript
// Before
type UserProfileRow = {
  primary_region: string | null;
  preferred_job_types: string[] | null;
  preferred_subjects: string[] | null;
  // ...
}

// After
type UserProfileRow = {
  capable_subjects: string[] | null;
  // ...
}
```

---

### 3. Edge Function (AI Recommendations)
**File**: `supabase/functions/profile-recommendations/index.ts`

**Changes**:
- ✅ Updated `UserProfileRow` type
- ✅ Renamed `isSchoolLevelCompatible` → `isCapableOfTeaching`
- ✅ Updated function to use `capable_subjects` instead of `preferred_subjects`
- ✅ Removed `primary_region` references
- ✅ Simplified scoring logic (focus on capable_subjects and interest_regions)
- ✅ Updated profile fetch query
- ✅ Updated profile snapshot in recommendations cache

**Key Logic Changes**:
```typescript
// Before
function isSchoolLevelCompatible(
  profileSubjects: string[] | null,
  jobSchoolLevel: string | null,
  jobSubject: string | null
): boolean

// After
function isCapableOfTeaching(
  capableSubjects: string[] | null,
  jobSchoolLevel: string | null,
  jobSubject: string | null
): boolean
```

---

### 4. Frontend Components

#### ProfileSetupModal.tsx
**Changes**:
- ✅ Removed `preferredJobTypes` state
- ✅ Removed `preferredSubjects` state
- ✅ Added `capableSubjects` state
- ✅ Updated profile load logic for edit mode
- ✅ Updated profile save logic

#### ProfileStep2Field.tsx
**Changes**:
- ✅ Renamed prop: `onSyncPreferredSubjects` → `onSyncCapableSubjects`
- ✅ Updated all function calls to use new prop name
- ✅ Syncs teacher subjects to `capable_subjects`

#### ProfileStep3Location.tsx
**Changes**:
- ✅ Removed `preferredJobTypes` props
- ✅ Removed `preferredSubjects` props
- ✅ Removed job type selection UI
- ✅ Removed subject selection UI
- ✅ Simplified to only: regions + introduction

---

## 🎯 Semantic Changes

### Old Approach (Preference-Based)
```
"What do you prefer to teach?"
- preferred_subjects: ["초등 과학", "초등 영어"]
- preferred_job_types: ["기간제", "시간제"]
- primary_region: "수원"
```

### New Approach (Capability-Based)
```
"What can you teach?"
- capable_subjects: ["초등 담임", "초등 과학", "초등 음악"]
- interest_regions: ["수원", "화성"]
```

**Benefits**:
1. **More Accurate**: Focuses on capabilities rather than preferences
2. **Simpler**: Fewer redundant fields
3. **Clearer**: Obvious what the fields mean
4. **Better Matching**: AI can recommend based on what you CAN do, not just what you PREFER

---

## 🔄 Data Migration

The migration automatically transfers existing data:

```sql
-- Existing preferred_subjects data is migrated to capable_subjects
UPDATE public.user_profiles
SET capable_subjects = preferred_subjects
WHERE preferred_subjects IS NOT NULL AND capable_subjects IS NULL;

-- Then old fields are dropped
ALTER TABLE public.user_profiles
DROP COLUMN IF EXISTS primary_region,
DROP COLUMN IF EXISTS preferred_job_types,
DROP COLUMN IF EXISTS preferred_subjects;
```

---

## ⚠️ Breaking Changes

### API Changes
- ❌ `primary_region` field no longer exists
- ❌ `preferred_job_types` field no longer exists
- ❌ `preferred_subjects` field no longer exists
- ✅ Use `capable_subjects` instead of `preferred_subjects`
- ✅ Use `interest_regions` instead of `primary_region`

### UI Changes
- ❌ Step 3 no longer shows job type selection
- ❌ Step 3 no longer shows subject preferences
- ✅ Step 2 syncs teacher subjects to `capable_subjects`
- ✅ Step 3 only shows region selection + introduction

---

## 📊 Impact on AI Recommendations

### Before
```typescript
// Scoring based on multiple preference fields
if (primary_region matches) score += 5;
if (interest_regions matches) score += 3;
if (preferred_subjects matches) score += 2;
```

### After
```typescript
// Scoring based on capabilities and interests
if (interest_regions matches) score += 8;  // Stronger weight
if (capable_subjects matches) score += 10; // Much stronger for capability match
if (!capable_of_teaching) score = -999;    // Hard filter
```

**Result**: More accurate recommendations based on actual teaching capabilities.

---

## 🧪 Testing Checklist

### Database
- [ ] Run migration: `20250125_simplify_user_profiles.sql`
- [ ] Verify `capable_subjects` column exists
- [ ] Verify old columns are removed
- [ ] Verify data migration completed

### Backend
- [ ] Profile creation works with new schema
- [ ] Profile editing loads existing data correctly
- [ ] Edge Function uses `capable_subjects` for filtering
- [ ] No references to removed fields remain

### Frontend
- [ ] Step 2 (Field): Teacher subjects sync to `capableSubjects`
- [ ] Step 3 (Location): Only shows regions + introduction
- [ ] Profile save includes `capable_subjects`
- [ ] Profile edit mode loads `capable_subjects`

### AI Recommendations
- [ ] Recommendations use `capable_subjects` for matching
- [ ] Incompatible school levels are filtered out
- [ ] Region scoring uses only `interest_regions`
- [ ] No errors in Edge Function logs

---

## 🚀 Deployment Steps

1. **Backup Database**
   ```bash
   # Create backup before migration
   supabase db dump > backup_before_profile_simplification.sql
   ```

2. **Apply Migration**
   ```bash
   supabase db push
   ```

3. **Verify Migration**
   ```sql
   -- Check column exists
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'user_profiles' 
   AND column_name = 'capable_subjects';
   
   -- Check data migration
   SELECT user_id, capable_subjects 
   FROM user_profiles 
   WHERE capable_subjects IS NOT NULL 
   LIMIT 10;
   ```

4. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy to your hosting platform
   ```

5. **Deploy Edge Function**
   ```bash
   supabase functions deploy profile-recommendations
   ```

---

## 📝 Next Steps

1. **Run the migration** on your Supabase database
2. **Test profile creation** with a new account
3. **Test profile editing** with an existing account
4. **Verify AI recommendations** use new fields
5. **Monitor for errors** in Edge Function logs
6. **Update any external documentation** referencing old fields

---

## 🔗 Related Files

### Modified Files
- `supabase/migrations/20250125_simplify_user_profiles.sql`
- `src/lib/supabase/profiles.ts`
- `supabase/functions/profile-recommendations/index.ts`
- `src/components/auth/ProfileSetupModal.tsx`
- `src/components/auth/ProfileStep2Field.tsx`
- `src/components/auth/ProfileStep3Location.tsx`

### Documentation
- This file: `PROFILE_SIMPLIFICATION_COMPLETE.md`
- Related: `AI_RECOMMENDATION_ANALYSIS_SUMMARY.md`
- Related: `DB_FIELD_SYNC_CHECK.md`

---

## ✨ Summary

The profile schema has been successfully simplified to focus on **capabilities** rather than **preferences**. This makes the system more accurate and easier to understand. The migration preserves existing user data while removing redundant fields.

**Key Change**: "What can you teach?" (capable_subjects) instead of "What do you prefer?" (preferred_subjects)
