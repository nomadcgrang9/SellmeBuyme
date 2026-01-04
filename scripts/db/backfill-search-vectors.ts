
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing in .env file');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function backfillSearchVectors() {
  console.log('Starting to backfill search_vector for existing job_postings...');

  // 한 번에 모든 데이터를 업데이트하는 것은 위험할 수 있으므로, 100개씩 나누어 처리합니다.
  const BATCH_SIZE = 100;
  let offset = 0;
  let updatedCount = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: jobs, error: fetchError } = await supabase
      .from('job_postings')
      .select('id, title, organization, location, tags, detail_content')
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchError) {
      console.error(`Error fetching jobs at offset ${offset}:`, fetchError);
      break;
    }

    if (!jobs || jobs.length === 0) {
      console.log('No more jobs to process. Exiting.');
      break;
    }

    const updates = jobs.map(job => {
      const searchText = [
        job.title,
        job.organization,
        job.location,
        Array.isArray(job.tags) ? job.tags.join(' ') : '',
        job.detail_content
      ].filter(Boolean).join(' ');

      // to_tsvector는 DB에서 직접 호출해야 하므로, 여기서는 업데이트할 내용을 준비만 합니다.
      // 실제로는 RPC를 통해 이 작업을 수행하는 것이 더 효율적입니다.
      // 이번에는 각 row를 개별적으로 업데이트하는 방식으로 진행합니다.
      return supabase
        .from('job_postings')
        .update({
          search_vector: supabase.sql`to_tsvector('korean', ${searchText})`
        })
        .eq('id', job.id);
    });

    const results = await Promise.all(updates);
    const successCount = results.filter(res => !res.error).length;
    updatedCount += successCount;

    results.forEach(res => {
      if (res.error) {
        console.error('Failed to update a job:', res.error);
      }
    });

    console.log(`Processed batch from offset ${offset}. ${successCount}/${jobs.length} successful.`);

    offset += BATCH_SIZE;

    if (jobs.length < BATCH_SIZE) {
      break; // 마지막 배치
    }
  }

  console.log(`Backfill complete. Total jobs updated: ${updatedCount}`);
}

backfillSearchVectors().catch(console.error);
