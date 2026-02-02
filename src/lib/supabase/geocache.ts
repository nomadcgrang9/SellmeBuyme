/**
 * Geocache API - 학교/기관명 → 좌표 캐싱
 * Kakao Places API 호출량 최소화를 위한 서버 사이드 캐시
 */

import { supabase } from './client';

export interface GeocacheEntry {
  organization: string;
  latitude: number;
  longitude: number;
  source?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * 단일 학교/기관명의 좌표 조회
 */
export async function getGeocache(organization: string): Promise<Coordinates | null> {
  try {
    const { data, error } = await supabase
      .from('geocache')
      .select('latitude, longitude')
      .eq('organization', organization)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      lat: parseFloat(data.latitude),
      lng: parseFloat(data.longitude)
    };
  } catch (e) {
    console.warn('[geocache] 조회 실패:', organization, e);
    return null;
  }
}

/**
 * 여러 학교/기관명의 좌표 일괄 조회 (배치 처리)
 */
export async function getGeocacheBatch(organizations: string[]): Promise<Map<string, Coordinates>> {
  const result = new Map<string, Coordinates>();

  if (organizations.length === 0) return result;

  // URL 길이 제한을 피하기 위해 50개씩 배치 처리
  const BATCH_SIZE = 50;

  try {
    for (let i = 0; i < organizations.length; i += BATCH_SIZE) {
      const batch = organizations.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase
        .from('geocache')
        .select('organization, latitude, longitude')
        .in('organization', batch);

      if (error) {
        console.warn('[geocache] 배치 조회 실패:', error.message);
        continue;  // 실패해도 다음 배치 계속
      }

      if (data) {
        data.forEach((entry) => {
          result.set(entry.organization, {
            lat: parseFloat(entry.latitude),
            lng: parseFloat(entry.longitude)
          });
        });
      }
    }

    console.log(`[geocache] 일괄 조회: ${organizations.length}개 요청 → ${result.size}개 히트`);
  } catch (e) {
    console.warn('[geocache] 일괄 조회 에러:', e);
  }

  return result;
}

/**
 * 좌표 저장 (중복 시 무시)
 */
export async function saveGeocache(
  organization: string,
  lat: number,
  lng: number,
  source: string = 'kakao'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('geocache')
      .upsert({
        organization,
        latitude: lat,
        longitude: lng,
        source,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization',
        ignoreDuplicates: true
      });

    if (error) {
      // UNIQUE 충돌은 무시 (이미 저장된 경우)
      if (error.code === '23505') {
        return true;
      }
      console.warn('[geocache] 저장 실패:', organization, error);
      return false;
    }

    console.log(`[geocache] 저장 완료: ${organization}`);
    return true;
  } catch (e) {
    console.warn('[geocache] 저장 에러:', organization, e);
    return false;
  }
}

/**
 * 여러 좌표 일괄 저장
 */
export async function saveGeocacheBatch(
  entries: Array<{ organization: string; lat: number; lng: number }>
): Promise<number> {
  if (entries.length === 0) return 0;

  try {
    const { error } = await supabase
      .from('geocache')
      .upsert(
        entries.map(e => ({
          organization: e.organization,
          latitude: e.lat,
          longitude: e.lng,
          source: 'kakao',
          updated_at: new Date().toISOString()
        })),
        {
          onConflict: 'organization',
          ignoreDuplicates: true
        }
      );

    if (error) {
      console.warn('[geocache] 일괄 저장 실패:', error);
      return 0;
    }

    console.log(`[geocache] 일괄 저장 완료: ${entries.length}개`);
    return entries.length;
  } catch (e) {
    console.warn('[geocache] 일괄 저장 에러:', e);
    return 0;
  }
}
