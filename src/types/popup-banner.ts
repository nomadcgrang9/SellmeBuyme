export type DismissPolicy = 'once' | '7days' | '1day' | 'always';

export interface PopupBannerConfig {
    id: string;
    isActive: boolean;
    dismissPolicy: DismissPolicy;
    rotationSpeed: number;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PopupBanner {
    id: string;
    title: string;
    body?: string;
    imageUrls: string[];
    linkUrl?: string;
    linkText: string;
    bgColor: string;
    textColor: string;
    displayOrder: number;
    isActive: boolean;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UpdatePopupBannerConfigInput {
    isActive?: boolean;
    dismissPolicy?: DismissPolicy;
    rotationSpeed?: number;
}

export interface CreatePopupBannerInput {
    title: string;
    body?: string;
    imageUrls?: string[];
    linkUrl?: string;
    linkText?: string;
    bgColor?: string;
    textColor?: string;
    displayOrder?: number;
    isActive?: boolean;
}

export interface UpdatePopupBannerInput {
    title?: string;
    body?: string;
    imageUrls?: string[];
    linkUrl?: string;
    linkText?: string;
    bgColor?: string;
    textColor?: string;
    displayOrder?: number;
    isActive?: boolean;
}
