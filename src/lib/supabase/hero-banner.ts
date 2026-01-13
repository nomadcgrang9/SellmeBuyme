import { supabase } from './client';
import type {
    HeroBannerConfig,
    HeroBanner,
    UpdateHeroBannerConfigInput,
    CreateHeroBannerInput,
    UpdateHeroBannerInput
} from '@/types/hero-banner';

// ========================================
// DB 스키마 (참고용)
// ========================================
/*
-- 히어로 배너 설정
CREATE TABLE hero_banner_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT true,
  rotation_speed INTEGER DEFAULT 5,  -- 초 단위 (3~10)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 히어로 배너 목록
CREATE TABLE hero_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(50) NOT NULL,        -- 1줄
  subtitle VARCHAR(50),              -- 2줄
  icon VARCHAR(20),                  -- 아이콘 키
  bg_color VARCHAR(7) DEFAULT '#3B82F6',
  text_color VARCHAR(7) DEFAULT '#FFFFFF',
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 데이터
INSERT INTO hero_banner_config (is_active, rotation_speed) VALUES (true, 5);
INSERT INTO hero_banners (title, subtitle, display_order, is_active) VALUES 
  ('공고와 선생님을 찾는', '가장 쉬운 방법 - 쌤찾기', 0, true);
*/

/**
 * 히어로 배너 설정 조회
 */
export async function getHeroBannerConfig(): Promise<HeroBannerConfig | null> {
    const { data, error } = await supabase
        .from('hero_banner_config')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching hero banner config:', error);
        return null;
    }

    // 데이터가 없으면 기본값 반환보다는 null 반환 후 처리 (또는 생성)
    if (!data) return null;

    return mapConfigFromDb(data);
}

/**
 * 히어로 배너 설정 업데이트 (없으면 생성)
 */
export async function updateHeroBannerConfig(
    updates: UpdateHeroBannerConfigInput
): Promise<HeroBannerConfig | null> {
    // 현재 설정 확인
    const current = await getHeroBannerConfig();

    const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
    };

    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.rotationSpeed !== undefined) dbUpdates.rotation_speed = updates.rotationSpeed;

    let query;

    if (current) {
        // 업데이트
        query = supabase
            .from('hero_banner_config')
            .update(dbUpdates)
            .eq('id', current.id)
            .select()
            .single();
    } else {
        // 생성 (초기값 포함)
        query = supabase
            .from('hero_banner_config')
            .insert({
                is_active: updates.isActive ?? true,
                rotation_speed: updates.rotationSpeed ?? 5,
                ...dbUpdates
            })
            .select()
            .single();
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error updating hero banner config:', error);
        return null;
    }

    return mapConfigFromDb(data);
}


/**
 * 활성화된 히어로 배너 목록 조회 (순서대로)
 */
export async function getActiveHeroBanners(): Promise<HeroBanner[]> {
    const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    if (error) {
        console.error('Error fetching active hero banners:', error);
        return [];
    }

    return data.map(mapBannerFromDb);
}

/**
 * 모든 히어로 배너 조회 (관리자용)
 */
export async function getAllHeroBanners(): Promise<HeroBanner[]> {
    const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .order('display_order');

    if (error) {
        console.error('Error fetching all hero banners:', error);
        return [];
    }

    return data.map(mapBannerFromDb);
}

/**
 * 히어로 배너 생성
 */
export async function createHeroBanner(
    input: CreateHeroBannerInput
): Promise<HeroBanner | null> {
    const { data, error } = await supabase
        .from('hero_banners')
        .insert({
            title: input.title,
            subtitle: input.subtitle,
            icon: input.icon,
            bg_color: input.bgColor || '#3B82F6',
            text_color: input.textColor || '#FFFFFF',
            link_url: input.linkUrl,
            display_order: input.displayOrder || 0,
            is_active: input.isActive ?? true,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating hero banner:', error);
        return null;
    }

    return mapBannerFromDb(data);
}

/**
 * 히어로 배너 업데이트
 */
export async function updateHeroBanner(
    id: string,
    updates: UpdateHeroBannerInput
): Promise<HeroBanner | null> {
    const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.subtitle !== undefined) dbUpdates.subtitle = updates.subtitle;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.bgColor !== undefined) dbUpdates.bg_color = updates.bgColor;
    if (updates.textColor !== undefined) dbUpdates.text_color = updates.textColor;
    if (updates.linkUrl !== undefined) dbUpdates.link_url = updates.linkUrl;
    if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await supabase
        .from('hero_banners')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating hero banner:', error);
        return null;
    }

    return mapBannerFromDb(data);
}

/**
 * 히어로 배너 삭제
 */
export async function deleteHeroBanner(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('hero_banners')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting hero banner:', error);
        return false;
    }

    return true;
}

// ========================================
// 매핑 함수
// ========================================

function mapConfigFromDb(row: Record<string, unknown>): HeroBannerConfig {
    return {
        id: row.id as string,
        isActive: row.is_active as boolean,
        rotationSpeed: row.rotation_speed as number,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string
    };
}

function mapBannerFromDb(row: Record<string, unknown>): HeroBanner {
    return {
        id: row.id as string,
        title: row.title as string,
        subtitle: row.subtitle as string | undefined,
        icon: row.icon as string | undefined,
        bgColor: row.bg_color as string,
        textColor: row.text_color as string,
        linkUrl: row.link_url as string | undefined,
        displayOrder: row.display_order as number,
        isActive: row.is_active as boolean,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string
    };
}
