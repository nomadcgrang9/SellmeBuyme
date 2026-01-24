import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * Dashboard Analytics Edge Function
 * 관리자 대시보드용 실제 통계 데이터 조회
 * SERVICE_ROLE_KEY를 사용하여 RLS 우회
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DailyTraffic {
  label: string;
  value: number;
}

interface HourlyData {
  label: string;
  value: number;
}

interface DeviceData {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface RegionData {
  region: string;
  visitors: number;
  percentage: number;
}

interface KPIData {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

interface DashboardAnalyticsData {
  kpi: {
    dau: KPIData;
    wau: KPIData;
    mau: KPIData;
    retention: KPIData;
  };
  traffic: DailyTraffic[];
  hourlyVisits: HourlyData[];
  deviceDistribution: DeviceData[];
  regionDistribution: RegionData[];
}

interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 환경 변수
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL') ??
      Deno.env.get('PROJECT_URL') ??
      '';

    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SERVICE_ROLE_KEY') ??
      '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('환경 변수 설정 필요: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    }

    // Service Role 클라이언트 (RLS 우회)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();

    // 날짜 범위 계산
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const twoWeeksAgo = new Date(todayStart);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const monthAgo = new Date(todayStart);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const twoMonthsAgo = new Date(todayStart);
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    // 1. 전체 page_view 로그 조회 (최근 60일)
    const { data: logs, error: logsError } = await supabase
      .from('user_activity_logs')
      .select('id, user_id, action_type, metadata, created_at')
      .eq('action_type', 'page_view')
      .gte('created_at', twoMonthsAgo.toISOString())
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('활동 로그 조회 실패:', logsError);
      throw logsError;
    }

    const allLogs: ActivityLog[] = logs ?? [];
    console.log(`[dashboard-analytics] 조회된 로그 수: ${allLogs.length}`);

    // 2. 세션 기반 고유 방문자 계산
    const getUniqueVisitors = (logList: ActivityLog[], startDate: Date, endDate: Date): number => {
      const sessionsInRange = new Set<string>();
      logList.forEach(log => {
        const logDate = new Date(log.created_at);
        if (logDate >= startDate && logDate < endDate) {
          const metadata = log.metadata;
          const sessionId = (metadata?.session_id as string) || log.id;
          sessionsInRange.add(sessionId);
        }
      });
      return sessionsInRange.size;
    };

    // DAU 계산
    const dauToday = getUniqueVisitors(allLogs, todayStart, now);
    const dauYesterday = getUniqueVisitors(allLogs, yesterdayStart, todayStart);
    const dauChange = dauYesterday > 0
      ? Math.round(((dauToday - dauYesterday) / dauYesterday) * 100)
      : (dauToday > 0 ? 100 : 0);

    // WAU 계산
    const wauThisWeek = getUniqueVisitors(allLogs, weekAgo, now);
    const wauLastWeek = getUniqueVisitors(allLogs, twoWeeksAgo, weekAgo);
    const wauChange = wauLastWeek > 0
      ? Math.round(((wauThisWeek - wauLastWeek) / wauLastWeek) * 100)
      : (wauThisWeek > 0 ? 100 : 0);

    // MAU 계산
    const mauThisMonth = getUniqueVisitors(allLogs, monthAgo, now);
    const mauLastMonth = getUniqueVisitors(allLogs, twoMonthsAgo, monthAgo);
    const mauChange = mauLastMonth > 0
      ? Math.round(((mauThisMonth - mauLastMonth) / mauLastMonth) * 100)
      : (mauThisMonth > 0 ? 100 : 0);

    // 재방문율 계산 (7일 내 2회 이상 방문한 세션 비율)
    const sessionsThisWeek = new Map<string, number>();
    allLogs.forEach(log => {
      const logDate = new Date(log.created_at);
      if (logDate >= weekAgo) {
        const metadata = log.metadata;
        const sessionId = (metadata?.session_id as string) || log.id;
        sessionsThisWeek.set(sessionId, (sessionsThisWeek.get(sessionId) || 0) + 1);
      }
    });
    const totalSessions = sessionsThisWeek.size;
    const returningSessions = Array.from(sessionsThisWeek.values()).filter(count => count > 1).length;
    const retentionRate = totalSessions > 0
      ? Math.round((returningSessions / totalSessions) * 1000) / 10
      : 0;

    // 3. 일일 방문자 추이 (최근 7일)
    const traffic: DailyTraffic[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const visitors = getUniqueVisitors(allLogs, dayStart, dayEnd);
      traffic.push({
        label: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
        value: visitors,
      });
    }

    // 4. 시간대별 방문 분포
    const hourlyMap = new Map<number, number>();
    allLogs.forEach(log => {
      const logDate = new Date(log.created_at);
      if (logDate >= weekAgo) {
        const hour = logDate.getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
      }
    });

    const hourlyVisits: HourlyData[] = [];
    for (let h = 0; h < 24; h++) {
      hourlyVisits.push({
        label: `${h}시`,
        value: hourlyMap.get(h) || 0,
      });
    }

    // 5. 디바이스 분포
    const deviceMap = new Map<string, number>();
    allLogs.forEach(log => {
      const logDate = new Date(log.created_at);
      if (logDate >= weekAgo) {
        const metadata = log.metadata;
        const deviceType = (metadata?.device_type as string) || 'unknown';
        deviceMap.set(deviceType, (deviceMap.get(deviceType) || 0) + 1);
      }
    });

    const totalDeviceCount = Array.from(deviceMap.values()).reduce((a, b) => a + b, 0);
    const deviceDistribution: DeviceData[] = [
      {
        label: '모바일',
        value: deviceMap.get('mobile') || 0,
        percentage: totalDeviceCount > 0 ? Math.round(((deviceMap.get('mobile') || 0) / totalDeviceCount) * 100) : 0,
        color: '#68B2FF',
      },
      {
        label: '태블릿',
        value: deviceMap.get('tablet') || 0,
        percentage: totalDeviceCount > 0 ? Math.round(((deviceMap.get('tablet') || 0) / totalDeviceCount) * 100) : 0,
        color: '#9B8AFF',
      },
      {
        label: '데스크톱',
        value: deviceMap.get('desktop') || 0,
        percentage: totalDeviceCount > 0 ? Math.round(((deviceMap.get('desktop') || 0) / totalDeviceCount) * 100) : 0,
        color: '#7DB8A3',
      },
    ];

    // 6. 지역별 분포
    const regionMap = new Map<string, number>();
    allLogs.forEach(log => {
      const logDate = new Date(log.created_at);
      if (logDate >= weekAgo) {
        const metadata = log.metadata;
        const city = (metadata?.region_city as string) || '기타';
        regionMap.set(city, (regionMap.get(city) || 0) + 1);
      }
    });

    const totalRegionCount = Array.from(regionMap.values()).reduce((a, b) => a + b, 0);
    const regionDistribution: RegionData[] = Array.from(regionMap.entries())
      .map(([region, visitors]) => ({
        region,
        visitors,
        percentage: totalRegionCount > 0 ? Math.round((visitors / totalRegionCount) * 100) : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10);

    // 결과 조합
    const result: DashboardAnalyticsData = {
      kpi: {
        dau: {
          value: dauToday,
          change: dauChange,
          trend: dauChange > 0 ? 'up' : dauChange < 0 ? 'down' : 'neutral',
        },
        wau: {
          value: wauThisWeek,
          change: wauChange,
          trend: wauChange > 0 ? 'up' : wauChange < 0 ? 'down' : 'neutral',
        },
        mau: {
          value: mauThisMonth,
          change: mauChange,
          trend: mauChange > 0 ? 'up' : mauChange < 0 ? 'down' : 'neutral',
        },
        retention: {
          value: retentionRate,
          change: 0,
          trend: 'neutral',
        },
      },
      traffic,
      hourlyVisits,
      deviceDistribution,
      regionDistribution,
    };

    console.log('[dashboard-analytics] 결과:', {
      dau: result.kpi.dau.value,
      wau: result.kpi.wau.value,
      mau: result.kpi.mau.value,
      로그수: allLogs.length,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[dashboard-analytics] 오류:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
