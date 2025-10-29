// Migration script to assign region codes to existing crawl boards
// Run with: npx tsx scripts/migrate-existing-boards.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// Board-to-Region Mapping
// =============================================================================

interface BoardRegionMapping {
  boardName: string;              // Name pattern to match (case-insensitive partial match)
  regionCode: string;             // Province code (e.g., 'KR-41')
  subregionCode: string | null;   // City code (e.g., '4113025' for 성남시)
  schoolLevel: 'elementary' | 'middle' | 'high' | 'mixed';
}

const BOARD_MAPPINGS: BoardRegionMapping[] = [
  // 경기도 전체 (Gyeonggi-do general board)
  {
    boardName: '경기',
    regionCode: 'KR-41',
    subregionCode: null,
    schoolLevel: 'mixed',
  },
  // 성남시 (Seongnam City)
  {
    boardName: '성남',
    regionCode: 'KR-41',
    subregionCode: '4113025',
    schoolLevel: 'mixed',
  },
  // 의정부시 (Uijeongbu City)
  {
    boardName: '의정부',
    regionCode: 'KR-41',
    subregionCode: '4127025',
    schoolLevel: 'mixed',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

async function buildRegionDisplayName(
  regionCode: string,
  subregionCode: string | null
): Promise<string> {
  const parts: string[] = [];

  // Fetch province name
  const { data: province } = await supabase
    .from('regions')
    .select('name')
    .eq('code', regionCode)
    .single();

  if (province) {
    parts.push(province.name);
  }

  // Fetch city name if provided
  if (subregionCode) {
    const { data: city } = await supabase
      .from('regions')
      .select('name')
      .eq('code', subregionCode)
      .single();

    if (city) {
      parts.push(city.name);
    }
  }

  return parts.join(' > ');
}

// =============================================================================
// Migration Logic
// =============================================================================

async function migrateCrawlBoards() {
  console.log('🚀 Starting migration of existing crawl boards...\n');

  // Fetch all crawl boards
  const { data: boards, error: fetchError } = await supabase
    .from('crawl_boards')
    .select('id, name, board_url');

  if (fetchError) {
    console.error('❌ Failed to fetch crawl boards:', fetchError);
    return;
  }

  if (!boards || boards.length === 0) {
    console.log('ℹ️  No crawl boards found in database.');
    return;
  }

  console.log(`📊 Found ${boards.length} boards to process\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const board of boards) {
    console.log(`\n🔍 Processing board: "${board.name}" (ID: ${board.id})`);

    // Find matching region mapping
    const mapping = BOARD_MAPPINGS.find((m) =>
      board.name.toLowerCase().includes(m.boardName.toLowerCase())
    );

    if (!mapping) {
      console.log(`⚠️  No mapping found for board "${board.name}" - skipping`);
      skipCount++;
      continue;
    }

    // Build region display name
    const regionDisplayName = await buildRegionDisplayName(
      mapping.regionCode,
      mapping.subregionCode
    );

    console.log(`  📍 Assigning region: ${regionDisplayName}`);
    console.log(`  🏫 School level: ${mapping.schoolLevel}`);

    // Update board with region information
    const { error: updateError } = await supabase
      .from('crawl_boards')
      .update({
        region_code: mapping.regionCode,
        subregion_code: mapping.subregionCode,
        region_display_name: regionDisplayName,
        school_level: mapping.schoolLevel,
        approved_at: new Date().toISOString(),
        approved_by: null, // System migration, no specific admin
      })
      .eq('id', board.id);

    if (updateError) {
      console.error(`  ❌ Failed to update board "${board.name}":`, updateError);
      errorCount++;
      continue;
    }

    console.log(`  ✅ Successfully updated board "${board.name}"`);
    successCount++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ⚠️  Skipped: ${skipCount}`);
  console.log(`  ❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));

  if (successCount > 0) {
    console.log('\n✨ Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with no successful updates');
  }
}

// =============================================================================
// Main Execution
// =============================================================================

(async () => {
  try {
    await migrateCrawlBoards();
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  }
})();
