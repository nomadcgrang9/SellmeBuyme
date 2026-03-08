import { supabase } from './client';
import type {
    PopupBannerConfig,
    PopupBanner,
    UpdatePopupBannerConfigInput,
    CreatePopupBannerInput,
    UpdatePopupBannerInput,
} from '@/types/popup-banner';

// ========================================
// Mapping helpers
// ========================================

function mapConfigFromDb(row: Record<string, unknown>): PopupBannerConfig {
    return {
        id: row.id as string,
        isActive: row.is_active as boolean,
        dismissPolicy: row.dismiss_policy as PopupBannerConfig['dismissPolicy'],
        rotationSpeed: (row.rotation_speed as number) ?? 3,
        updatedBy: row.updated_by as string | undefined,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

function mapBannerFromDb(row: Record<string, unknown>): PopupBanner {
    return {
        id: row.id as string,
        title: row.title as string,
        body: row.body as string | undefined,
        imageUrls: (row.image_urls as string[]) || [],
        linkUrl: row.link_url as string | undefined,
        linkText: (row.link_text as string) || '자세히 보기',
        bgColor: (row.bg_color as string) || '#FFFFFF',
        textColor: (row.text_color as string) || '#1F2937',
        displayOrder: row.display_order as number,
        isActive: row.is_active as boolean,
        updatedBy: row.updated_by as string | undefined,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

// ========================================
// Config CRUD
// ========================================

export async function getPopupBannerConfig(): Promise<PopupBannerConfig | null> {
    const { data, error } = await supabase
        .from('popup_banner_config')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching popup banner config:', error);
        return null;
    }
    if (!data) return null;
    return mapConfigFromDb(data);
}

export async function updatePopupBannerConfig(
    updates: UpdatePopupBannerConfigInput
): Promise<PopupBannerConfig | null> {
    const current = await getPopupBannerConfig();
    const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.dismissPolicy !== undefined) dbUpdates.dismiss_policy = updates.dismissPolicy;
    if (updates.rotationSpeed !== undefined) dbUpdates.rotation_speed = updates.rotationSpeed;

    let query;
    if (current) {
        query = supabase
            .from('popup_banner_config')
            .update(dbUpdates)
            .eq('id', current.id)
            .select()
            .single();
    } else {
        query = supabase
            .from('popup_banner_config')
            .insert({
                is_active: updates.isActive ?? false,
                dismiss_policy: updates.dismissPolicy ?? 'once',
                rotation_speed: updates.rotationSpeed ?? 3,
                ...dbUpdates,
            })
            .select()
            .single();
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error updating popup banner config:', error);
        return null;
    }
    return mapConfigFromDb(data);
}

// ========================================
// Banner CRUD
// ========================================

export async function getActivePopupBanners(): Promise<PopupBanner[]> {
    const { data, error } = await supabase
        .from('popup_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    if (error) {
        console.error('Error fetching active popup banners:', error);
        return [];
    }
    return data.map(mapBannerFromDb);
}

export async function getAllPopupBanners(): Promise<PopupBanner[]> {
    const { data, error } = await supabase
        .from('popup_banners')
        .select('*')
        .order('display_order');

    if (error) {
        console.error('Error fetching all popup banners:', error);
        return [];
    }
    return data.map(mapBannerFromDb);
}

export async function createPopupBanner(
    input: CreatePopupBannerInput
): Promise<PopupBanner | null> {
    const { data, error } = await supabase
        .from('popup_banners')
        .insert({
            title: input.title,
            body: input.body,
            image_urls: input.imageUrls ?? [],
            link_url: input.linkUrl,
            link_text: input.linkText ?? '자세히 보기',
            bg_color: input.bgColor ?? '#FFFFFF',
            text_color: input.textColor ?? '#1F2937',
            display_order: input.displayOrder ?? 0,
            is_active: input.isActive ?? true,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating popup banner:', error);
        return null;
    }
    return mapBannerFromDb(data);
}

export async function updatePopupBanner(
    id: string,
    updates: UpdatePopupBannerInput
): Promise<PopupBanner | null> {
    const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.body !== undefined) dbUpdates.body = updates.body;
    if (updates.imageUrls !== undefined) dbUpdates.image_urls = updates.imageUrls;
    if (updates.linkUrl !== undefined) dbUpdates.link_url = updates.linkUrl;
    if (updates.linkText !== undefined) dbUpdates.link_text = updates.linkText;
    if (updates.bgColor !== undefined) dbUpdates.bg_color = updates.bgColor;
    if (updates.textColor !== undefined) dbUpdates.text_color = updates.textColor;
    if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await supabase
        .from('popup_banners')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating popup banner:', error);
        return null;
    }
    return mapBannerFromDb(data);
}

export async function deletePopupBanner(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('popup_banners')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting popup banner:', error);
        return false;
    }
    return true;
}

// ========================================
// Image Upload
// ========================================

export async function uploadPopupBannerImage(file: File): Promise<string | null> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('popup-banners')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Error uploading popup banner image:', uploadError);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('popup-banners')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Upload exception:', error);
        return null;
    }
}
