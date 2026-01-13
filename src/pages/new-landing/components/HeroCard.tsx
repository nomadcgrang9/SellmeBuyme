import React, { useState, useEffect, useRef } from 'react';
import {
    IconSearch,
    IconSchool,
    IconSpeakerphone,
    IconConfetti,
    IconBriefcase
} from '@tabler/icons-react';
import { getHeroBannerConfig, getActiveHeroBanners } from '@/lib/supabase/hero-banner';
import type { HeroBanner, HeroBannerConfig } from '@/types/hero-banner';

// ----------------------------------------------------------------------
// Icons Map (Preview와 동일)
// ----------------------------------------------------------------------
const ICON_MAP: Record<string, React.ReactNode> = {
    'search': <IconSearch size={20} />,
    'school': <IconSchool size={20} />,
    'notice': <IconSpeakerphone size={20} />,
    'party': <IconConfetti size={20} />,
    'bag': <IconBriefcase size={20} />,
};

// 기본 배너 (데이터 로딩 전 또는 없을 때 표시)
const DEFAULT_BANNER: HeroBanner = {
    id: 'default',
    title: '공고와 선생님을 찾는',
    subtitle: '가장 쉬운 방법 - 쌤찾기',
    bgColor: '#3B82F6',
    textColor: '#FFFFFF',
    displayOrder: 0,
    isActive: true,
    createdAt: '',
    updatedAt: ''
};

export default function HeroCard() {
    const [config, setConfig] = useState<HeroBannerConfig | null>(null);
    const [banners, setBanners] = useState<HeroBanner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // 데이터 로드
    useEffect(() => {
        const loadBanners = async () => {
            try {
                const [configData, bannersData] = await Promise.all([
                    getHeroBannerConfig(),
                    getActiveHeroBanners()
                ]);

                setConfig(configData);
                if (bannersData.length > 0) {
                    setBanners(bannersData);
                } else {
                    // DB에 데이터가 없으면 기본값 사용
                    setBanners([DEFAULT_BANNER]);
                }
            } catch (error) {
                console.error('Failed to load hero banners:', error);
                setBanners([DEFAULT_BANNER]);
            } finally {
                setIsLoading(false);
            }
        };

        loadBanners();
    }, []);

    // 캐러셀 타이머
    useEffect(() => {
        // 배너가 1개 이하이거나 설정이 없거나 비활성 상태면 타이머 실행 안 함
        if (banners.length <= 1 || !config?.isActive) return;

        const interval = (config.rotationSpeed || 5) * 1000;

        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % banners.length);
        }, interval);

        return () => clearInterval(timer);
    }, [banners.length, config]);

    // 설정상 전체 비활성화면 렌더링 안 함 (또는 기본값 표시? 기획에 따라 다름)
    // 여기서는 로딩 중에는 기본값, 로딩 후 isActive가 false면 null 반환
    if (!isLoading && config && !config.isActive) {
        return null;
    }

    const currentBanner = banners[currentIndex] || DEFAULT_BANNER;

    // 클릭 핸들러
    const handleClick = () => {
        if (currentBanner.linkUrl) {
            window.open(currentBanner.linkUrl, '_blank');
        }
    };

    return (
        <div className="mx-3 my-3 flex-shrink-0 animate-fadeIn relative z-10">
            <div
                onClick={handleClick}
                className={`
          rounded-lg px-4 py-4 transition-all duration-500 ease-in-out relative overflow-hidden shadow-sm
          ${currentBanner.linkUrl ? 'cursor-pointer hover:brightness-95' : ''}
        `}
                style={{ backgroundColor: currentBanner.bgColor }}
            >
                <div className="flex items-start gap-3">
                    {/* 아이콘 */}
                    {currentBanner.icon && ICON_MAP[currentBanner.icon] && (
                        <div style={{ color: currentBanner.textColor }} className="mt-0.5 flex-shrink-0 animate-bounce-slow">
                            {ICON_MAP[currentBanner.icon]}
                        </div>
                    )}

                    {/* 텍스트 */}
                    <div className="flex-1 min-w-0">
                        <p
                            className="text-sm font-semibold leading-snug break-keep transition-opacity duration-300"
                            style={{ color: currentBanner.textColor }}
                        >
                            {currentBanner.title}
                            {currentBanner.subtitle && (
                                <>
                                    <br />
                                    <span className="opacity-95 text-[13px]">{currentBanner.subtitle}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* 인디케이터 (배너가 2개 이상일 때) */}
                {banners.length > 1 && (
                    <div className="flex gap-1.5 mt-3 justify-center">
                        {banners.map((_, idx) => (
                            <div
                                key={idx}
                                className={`
                   h-1.5 rounded-full transition-all duration-300
                   ${idx === currentIndex ? 'w-4 opacity-100' : 'w-1.5 opacity-40'}
                 `}
                                style={{
                                    backgroundColor: currentBanner.textColor
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
