// Region Query Functions
// Handles fetching and managing regional data for crawl board management

import { supabase } from './client';
import type { Region } from '@/types';

// =============================================================================
// Region Fetching Functions
// =============================================================================

/**
 * Fetch all provinces (광역자치단체)
 * Returns 17 provinces sorted by display_order
 */
export async function fetchAllProvinces(): Promise<Region[]> {
  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .eq('level', 'province')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('❌ Failed to fetch provinces:', error);
    throw error;
  }

  return data.map(row => ({
    code: row.code,
    name: row.name,
    level: row.level as 'province' | 'city' | 'district',
    parentCode: row.parent_code,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  }));
}

/**
 * Fetch cities/districts for a specific province
 * @param provinceCode - Province code (e.g., 'KR-41' for Gyeonggi)
 * @returns Array of cities sorted by display_order
 */
export async function fetchCitiesByProvince(provinceCode: string): Promise<Region[]> {
  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .eq('parent_code', provinceCode)
    .order('display_order', { ascending: true });

  if (error) {
    console.error(`❌ Failed to fetch cities for province ${provinceCode}:`, error);
    throw error;
  }

  return data.map(row => ({
    code: row.code,
    name: row.name,
    level: row.level as 'province' | 'city' | 'district',
    parentCode: row.parent_code,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  }));
}

/**
 * Fetch a single region by code
 * @param code - Region code (e.g., 'KR-41' or '4136025')
 */
export async function fetchRegionByCode(code: string): Promise<Region | null> {
  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error(`❌ Failed to fetch region ${code}:`, error);
    throw error;
  }

  return {
    code: data.code,
    name: data.name,
    level: data.level as 'province' | 'city' | 'district',
    parentCode: data.parent_code,
    displayOrder: data.display_order,
    createdAt: data.created_at,
  };
}

// =============================================================================
// Display Name Builder
// =============================================================================

/**
 * Build region display name for UI
 * @param regionCode - Province code (e.g., 'KR-41')
 * @param subregionCode - City code (e.g., '4136025')
 * @returns Display string like "경기도 > 남양주시" or "경기도" or ""
 *
 * @example
 * buildRegionDisplayName('KR-41', '4136025') // "경기도 > 남양주시"
 * buildRegionDisplayName('KR-41', null) // "경기도"
 * buildRegionDisplayName(null, null) // ""
 */
export async function buildRegionDisplayName(
  regionCode?: string | null,
  subregionCode?: string | null
): Promise<string> {
  if (!regionCode) {
    return '';
  }

  const parts: string[] = [];

  // Fetch province name
  const province = await fetchRegionByCode(regionCode);
  if (province) {
    parts.push(province.name);
  }

  // Fetch city name if provided
  if (subregionCode) {
    const city = await fetchRegionByCode(subregionCode);
    if (city) {
      parts.push(city.name);
    }
  }

  return parts.join(' > ');
}

/**
 * Batch build region display names (optimized for multiple regions)
 * @param regions - Array of {regionCode, subregionCode} tuples
 * @returns Map of "regionCode|subregionCode" -> display name
 */
export async function buildRegionDisplayNames(
  regions: Array<{ regionCode?: string | null; subregionCode?: string | null }>
): Promise<Map<string, string>> {
  const uniqueCodes = new Set<string>();

  regions.forEach(({ regionCode, subregionCode }) => {
    if (regionCode) uniqueCodes.add(regionCode);
    if (subregionCode) uniqueCodes.add(subregionCode);
  });

  // Fetch all unique region codes in one query
  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .in('code', Array.from(uniqueCodes));

  if (error) {
    console.error('❌ Failed to batch fetch regions:', error);
    throw error;
  }

  const regionMap = new Map<string, string>();
  data.forEach(row => {
    regionMap.set(row.code, row.name);
  });

  // Build display names
  const result = new Map<string, string>();

  regions.forEach(({ regionCode, subregionCode }) => {
    const key = `${regionCode || ''}|${subregionCode || ''}`;
    const parts: string[] = [];

    if (regionCode && regionMap.has(regionCode)) {
      parts.push(regionMap.get(regionCode)!);
    }

    if (subregionCode && regionMap.has(subregionCode)) {
      parts.push(regionMap.get(subregionCode)!);
    }

    result.set(key, parts.join(' > '));
  });

  return result;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate if a subregion code belongs to a province
 * @param provinceCode - Province code (e.g., 'KR-41')
 * @param subregionCode - City code (e.g., '4136025')
 * @returns true if subregion is child of province
 */
export async function validateSubregionBelongsToProvince(
  provinceCode: string,
  subregionCode: string
): Promise<boolean> {
  const subregion = await fetchRegionByCode(subregionCode);
  return subregion?.parentCode === provinceCode;
}
