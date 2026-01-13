export interface HeroBannerConfig {
    id: string;
    isActive: boolean;
    rotationSpeed: number; // 초 단위 (3~10)
    createdAt: string;
    updatedAt: string;
}

export interface HeroBanner {
    id: string;
    title: string;       // 1줄, 권장 14자 이내
    subtitle?: string;   // 2줄, 권장 14자 이내
    icon?: string;       // 이모지 또는 아이콘 키 ('search', 'grad', 'notice', 'party', 'bag')
    bgColor: string;     // HEX (#3B82F6)
    textColor: string;   // HEX (#FFFFFF)
    linkUrl?: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateHeroBannerConfigInput {
    isActive?: boolean;
    rotationSpeed?: number;
}

export interface CreateHeroBannerInput {
    title: string;
    subtitle?: string;
    icon?: string;
    bgColor?: string;
    textColor?: string;
    linkUrl?: string;
    displayOrder?: number;
    isActive?: boolean;
}

export interface UpdateHeroBannerInput {
    title?: string;
    subtitle?: string;
    icon?: string;
    bgColor?: string;
    textColor?: string;
    linkUrl?: string;
    displayOrder?: number;
    isActive?: boolean;
}
