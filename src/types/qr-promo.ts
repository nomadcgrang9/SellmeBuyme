export interface QrPromoConfig {
    id: string;
    title: string;
    body: string;
    imageUrls: string[];
    rotationSpeed: number;
    isActive: boolean;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateQrPromoConfigInput {
    title?: string;
    body?: string;
    imageUrls?: string[];
    rotationSpeed?: number;
    isActive?: boolean;
}
