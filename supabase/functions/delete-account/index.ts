import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabaseUrl =
  Deno.env.get('SUPABASE_URL') ??
  Deno.env.get('PROJECT_URL') ??
  '';

const anonKey =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  Deno.env.get('ANON_KEY') ??
  '';

const serviceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SERVICE_ROLE_KEY') ??
  '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return new Response(JSON.stringify({ message: '인증 토큰이 필요합니다.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 사용자 인증 확인 (anon key 기반)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    console.error('[delete-account] 사용자 인증 실패:', authError);
    return new Response(JSON.stringify({ message: '사용자를 확인할 수 없습니다.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!serviceRoleKey) {
    console.error('[delete-account] SERVICE_ROLE_KEY가 설정되지 않았습니다.');
    return new Response(JSON.stringify({ message: '서버 설정 오류입니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const userId = user.id;
    console.log('[delete-account] 탈퇴 처리 시작 - user_id:', userId);

    // service_role 클라이언트 (admin 권한)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. 프로필 이미지 삭제 (Storage)
    try {
      const { data: files } = await adminClient.storage
        .from('profiles')
        .list(`profile-images/${userId}`);

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `profile-images/${userId}/${f.name}`);
        await adminClient.storage.from('profiles').remove(filePaths);
        console.log('[delete-account] 프로필 이미지 삭제 완료:', filePaths.length, '건');
      }
    } catch (storageErr) {
      console.warn('[delete-account] 프로필 이미지 삭제 중 오류 (계속 진행):', storageErr);
    }

    // 2. auth.users 삭제 (CASCADE로 user_profiles, markers, chat, bookmarks 자동 삭제)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[delete-account] 사용자 삭제 실패:', deleteError);
      return new Response(JSON.stringify({ message: '탈퇴 처리에 실패했습니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[delete-account] 탈퇴 완료 - user_id:', userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[delete-account] 처리 중 예외:', err);
    return new Response(JSON.stringify({ message: '탈퇴 처리 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
