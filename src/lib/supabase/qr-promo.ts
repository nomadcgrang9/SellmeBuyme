import { supabase } from './client';
import type { QrPromoConfig, UpdateQrPromoConfigInput } from '@/types/qr-promo';

// ========================================
// Mapping helpers
// ========================================

function mapConfigFromDb(row: Record<string, unknown>): QrPromoConfig {
    return {
        id: row.id as string,
        title: (row.title as string) || '',
        body: (row.body as string) || '',
        imageUrls: (row.image_urls as string[]) || [],
        rotationSpeed: (row.rotation_speed as number) ?? 3,
        isActive: row.is_active as boolean,
        updatedBy: row.updated_by as string | undefined,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

// ========================================
// Config CRUD
// ========================================

export async function getQrPromoConfig(): Promise<QrPromoConfig | null> {
    const { data, error } = await supabase
        .from('qr_promo_config')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching QR promo config:', error);
        return null;
    }
    if (!data) return null;
    return mapConfigFromDb(data);
}

export async function updateQrPromoConfig(
    updates: UpdateQrPromoConfigInput
): Promise<QrPromoConfig | null> {
    const current = await getQrPromoConfig();
    const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.body !== undefined) dbUpdates.body = updates.body;
    if (updates.imageUrls !== undefined) dbUpdates.image_urls = updates.imageUrls;
    if (updates.rotationSpeed !== undefined) dbUpdates.rotation_speed = updates.rotationSpeed;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    let query;
    if (current) {
        query = supabase
            .from('qr_promo_config')
            .update(dbUpdates)
            .eq('id', current.id)
            .select()
            .single();
    } else {
        query = supabase
            .from('qr_promo_config')
            .insert({
                title: updates.title ?? '학교일자리 한번 등록해보세요',
                body: updates.body ?? '',
                image_urls: updates.imageUrls ?? [],
                rotation_speed: updates.rotationSpeed ?? 3,
                is_active: updates.isActive ?? true,
                ...dbUpdates,
            })
            .select()
            .single();
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error updating QR promo config:', error);
        return null;
    }
    return mapConfigFromDb(data);
}

// ========================================
// Image Upload (popup-banners 버킷 공유)
// ========================================

export async function uploadQrPromoImage(file: File): Promise<string | null> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `qr_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('popup-banners')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Error uploading QR promo image:', uploadError);
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
