import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMigrationStatus() {
  console.log('🔍 채팅 테이블 존재 여부 확인...\n');
  console.log('='.repeat(60));

  // 1. chat_rooms 테이블 존재 확인
  console.log('\n📍 Step 1: chat_rooms 테이블 확인');
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('❌ chat_rooms 테이블이 존재하지 않습니다!');
        console.log(`   에러: ${error.message}`);
      } else {
        console.log(`⚠️  조회 에러: ${error.message}`);
      }
    } else {
      console.log('✅ chat_rooms 테이블 존재');
    }
  } catch (err: any) {
    console.log(`❌ 테이블 확인 실패: ${err.message}`);
  }

  // 2. chat_messages 테이블 존재 확인
  console.log('\n📍 Step 2: chat_messages 테이블 확인');
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('❌ chat_messages 테이블이 존재하지 않습니다!');
        console.log(`   에러: ${error.message}`);
      } else {
        console.log(`⚠️  조회 에러: ${error.message}`);
      }
    } else {
      console.log('✅ chat_messages 테이블 존재');
    }
  } catch (err: any) {
    console.log(`❌ 테이블 확인 실패: ${err.message}`);
  }

  // 3. chat_participants 테이블 존재 확인
  console.log('\n📍 Step 3: chat_participants 테이블 확인');
  try {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('❌ chat_participants 테이블이 존재하지 않습니다!');
        console.log(`   에러: ${error.message}`);
      } else {
        console.log(`⚠️  조회 에러: ${error.message}`);
      }
    } else {
      console.log('✅ chat_participants 테이블 존재');
    }
  } catch (err: any) {
    console.log(`❌ 테이블 확인 실패: ${err.message}`);
  }

  // 4. PostgreSQL 함수 존재 확인
  console.log('\n📍 Step 4: get_or_create_chat_room 함수 확인');
  try {
    const { data, error } = await supabase.rpc('get_or_create_chat_room', {
      user1_id: '00000000-0000-0000-0000-000000000000',
      user2_id: '00000000-0000-0000-0000-000000000001',
    });

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('function')) {
        console.log('❌ get_or_create_chat_room 함수가 존재하지 않습니다!');
        console.log(`   에러: ${error.message}`);
      } else {
        // 인증 에러는 정상 (함수는 존재함)
        if (error.message.includes('JWT') || error.message.includes('auth')) {
          console.log('✅ get_or_create_chat_room 함수 존재 (인증 필요)');
        } else {
          console.log(`⚠️  함수 호출 에러: ${error.message}`);
        }
      }
    } else {
      console.log('✅ get_or_create_chat_room 함수 존재');
    }
  } catch (err: any) {
    console.log(`❌ 함수 확인 실패: ${err.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 결론\n');
  console.log('위 4가지 항목 중 ❌가 하나라도 있으면:');
  console.log('→ 마이그레이션이 실행되지 않았습니다!');
  console.log('\n해결 방법:');
  console.log('1. Supabase 대시보드 → SQL Editor 접속');
  console.log('2. supabase/migrations/20250113_chat_system.sql 내용 복사');
  console.log('3. 붙여넣기 후 Run 실행');
  console.log('\n또는:');
  console.log('supabase db reset (로컬 개발 환경인 경우)');
  console.log('\n✅ 진단 완료!');
}

checkMigrationStatus().catch(console.error);
