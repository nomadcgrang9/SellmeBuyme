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
    return null;
  }
}

/**
 * 여러 학교/기관명의 좌표 일괄 조회 (배치 처리)
 */
export async function getGeocacheBatch(organizations: string[]): Promise<Map<string, Coordinates>> {
  const result = new Map<string, Coordinates>();

  if (organizations.length === 0) return result;

  // URL 길이 제한을 피하기 위해 20개씩 배치 처리 (한글 학교명이 길어서 URL 초과 방지)
  const BATCH_SIZE = 20;

  try {
    for (let i = 0; i < organizations.length; i += BATCH_SIZE) {
      const batch = organizations.slice(i, i + BATCH_SIZE);


      const { data, error } = await supabase
        .from('geocache')
        .select('organization, latitude, longitude')
        .in('organization', batch);


      if (error) {
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

  } catch (e) {
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
      return false;
    }

    return true;
  } catch (e) {
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
      return 0;
    }

    return entries.length;
  } catch (e) {
    return 0;
  }
}
