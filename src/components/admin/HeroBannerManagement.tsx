import React, { useState, useEffect } from 'react';
import {
    IconLayoutBoard,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconPlus,
    IconEdit,
    IconTrash,
    IconEye,
    IconEyeOff,
    IconDeviceFloppy,
    IconRotate,
    IconCheck,
    IconChevronDown,
    IconExclamationCircle,
    IconSearch,
    IconSchool,
    IconSpeakerphone,
    IconConfetti,
    IconBriefcase
} from '@tabler/icons-react';
import {
    getHeroBannerConfig,
    getAllHeroBanners,
    updateHeroBannerConfig,
    createHeroBanner,
    updateHeroBanner,
    deleteHeroBanner
} from '@/lib/supabase/hero-banner';
import type { HeroBanner, HeroBannerConfig } from '@/types/hero-banner';

// ----------------------------------------------------------------------
// Icons Map
// ----------------------------------------------------------------------
const ICON_MAP: Record<string, React.ReactNode> = {
    'search': <IconSearch size={16} />,
    'school': <IconSchool size={16} />,
    'notice': <IconSpeakerphone size={16} />,
    'party': <IconConfetti size={16} />,
    'bag': <IconBriefcase size={16} />,
};

const ICON_OPTIONS = [
    { value: 'none', label: '없음' },
    { value: 'search', label: '돋보기 (검색)' },
    { value: 'school', label: '학교' },
    { value: 'notice', label: '확성기 (공지)' },
    { value: 'party', label: '폭죽 (이벤트)' },
    { value: 'bag', label: '가방 (채용)' },
];

// ----------------------------------------------------------------------
// Preview Component
// ----------------------------------------------------------------------

interface PreviewProps {
    banners: HeroBanner[];
    config: HeroBannerConfig;
    activeIndex: number;
}

function HeroBannerPreview({ banners, config, activeIndex }: PreviewProps) {
    // 실제 렌더링될 배너 필터링 (활성화된 것만)
    // 관리자 모드에서는 모든 배너를 보여주되, 비활성화된 것은 흐릿하게 처리하는 등의 UX가 필요할 수 있음
    // 하지만 여기서는 선택된 배너를 보여주거나 캐러셀 동작을 시뮬레이션

    const currentBanner = banners[activeIndex];

    if (!currentBanner) {
        return (
            <div className="w-[240px] h-[100px] bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                배너가 없습니다
            </div>
        );
    }

    // 글자 수 체크
    const titleLen = currentBanner.title.length;
    const subtitleLen = currentBanner.subtitle?.length || 0;
    const isTitleOver = titleLen > 14;
    const isSubtitleOver = subtitleLen > 14;
    const isTotalOver = titleLen + subtitleLen > 30; // 대략적인 기준

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold">실제 크기 미리보기 (240px)</span>
                {currentBanner.isActive ? (
                    <span className="text-green-600 flex items-center gap-1"><IconCheck size={12} /> 노출 중</span>
                ) : (
                    <span className="text-slate-400">비활성화됨</span>
                )}
            </div>

            {/* 배너 미리보기 컨테이너 (실제 Hero 영역 시뮬레이션) */}
            <div className="w-[240px] bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                {/* Hero Card 영역 */}
                <div className="mx-0 my-0 flex-shrink-0">
                    <div
                        className="rounded-lg px-4 py-4 transition-all duration-300 relative overflow-hidden"
                        style={{ backgroundColor: currentBanner.bgColor }}
                    >
                        <div className="flex items-start gap-3">
                            {/* 아이콘 */}
                            {currentBanner.icon && ICON_MAP[currentBanner.icon] && (
                                <div style={{ color: currentBanner.textColor }} className="mt-0.5 flex-shrink-0">
                                    {ICON_MAP[currentBanner.icon]}
                                </div>
                            )}

                            {/* 텍스트 */}
                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-sm font-semibold leading-snug break-keep"
                                    style={{ color: currentBanner.textColor }}
                                >
                                    {currentBanner.title}
                                    {currentBanner.subtitle && (
                                        <>
                                            <br />
                                            {currentBanner.subtitle}
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* 인디케이터 (배너가 2개 이상일 때) */}
                        {banners.filter(b => b.isActive).length > 1 && (
                            <div className="flex gap-1 mt-3 justify-center">
                                {banners.filter(b => b.isActive).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{
                                            backgroundColor: currentBanner.textColor,
                                            opacity: 0.4
                                        }}
                                    />
                                ))}
                                {/* 활성 인디케이터 덮어쓰기 시뮬레이션은 생략하거나 단순히 첫번째꺼 진하게 */}
                                <div
                                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1"
                                >
                                    {/* 실제로는 active index에 따라 다름 */}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 경고 메시지 */}
            {(isTitleOver || isSubtitleOver || isTotalOver) && (
                <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    <IconExclamationCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">텍스트 길이 주의</p>
                        <p>모바일 화면에서 줄바꿈이 과도하게 발생할 수 있습니다.</p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5 opacity-80">
                            {isTitleOver && <li>제목이 14자를 초과함 ({titleLen}자)</li>}
                            {isSubtitleOver && <li>부제가 14자를 초과함 ({subtitleLen}자)</li>}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

export default function HeroBannerManagement() {
    const [activeTab, setActiveTab] = useState<'hero' | 'native'>('hero');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // States
    const [config, setConfig] = useState<HeroBannerConfig | null>(null);
    const [banners, setBanners] = useState<HeroBanner[]>([]);

    // Editing State
    const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
    const [previewBannerIndex, setPreviewBannerIndex] = useState(0);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [configData, bannersData] = await Promise.all([
                getHeroBannerConfig(),
                getAllHeroBanners()
            ]);

            // Config가 없으면 기본값으로 생성해야 함 (여기선 null 처리만 하고 저장 시 생성)
            setConfig(configData || {
                id: '',
                isActive: true,
                rotationSpeed: 5,
                createdAt: '',
                updatedAt: ''
            });
            setBanners(bannersData);

            if (bannersData.length > 0) {
                setEditingBannerId(bannersData[0].id);
            }
        } catch (e) {
            console.error(e);
            alert('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // ----------------------------------------------------------------------
    // Handlers
    // ----------------------------------------------------------------------

    const handleConfigChange = (key: keyof HeroBannerConfig, value: any) => {
        if (!config) return;
        setConfig({ ...config, [key]: value });
    };

    const handleConfigSave = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            await updateHeroBannerConfig({
                isActive: config.isActive,
                rotationSpeed: config.rotationSpeed
            });
            alert('설정이 저장되었습니다.');
        } catch (e) {
            console.error(e);
            alert('저장 실패');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBannerChange = (id: string, field: keyof HeroBanner, value: any) => {
        setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const handleBannerSave = async (id: string) => {
        const banner = banners.find(b => b.id === id);
        if (!banner) return;

        // 유효성 검사
        if (!banner.title.trim()) {
            alert('제목을 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            if (id.startsWith('temp-')) {
                // 생성
                const created = await createHeroBanner({
                    title: banner.title,
                    subtitle: banner.subtitle,
                    icon: banner.icon,
                    bgColor: banner.bgColor,
                    textColor: banner.textColor,
                    linkUrl: banner.linkUrl,
                    displayOrder: banner.displayOrder,
                    isActive: banner.isActive
                });
                if (created) {
                    setBanners(prev => prev.map(b => b.id === id ? created : b));
                    setEditingBannerId(created.id);
                }
            } else {
                // 수정
                await updateHeroBanner(id, {
                    title: banner.title,
                    subtitle: banner.subtitle,
                    icon: banner.icon,
                    bgColor: banner.bgColor,
                    textColor: banner.textColor,
                    linkUrl: banner.linkUrl,
                    displayOrder: banner.displayOrder,
                    isActive: banner.isActive
                });
            }
            alert('배너가 저장되었습니다.');
        } catch (e) {
            console.error(e);
            alert('저장 실패');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddBanner = () => {
        const newBanner: HeroBanner = {
            id: `temp-${Date.now()}`,
            title: '새 배너',
            subtitle: '',
            bgColor: '#3B82F6',
            textColor: '#FFFFFF',
            displayOrder: banners.length,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setBanners([...banners, newBanner]);
        setEditingBannerId(newBanner.id);
        setPreviewBannerIndex(banners.length); // 마지막으로 이동
    };

    const handleDeleteBanner = async (id: string) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;

        if (!id.startsWith('temp-')) {
            setIsSaving(true);
            try {
                await deleteHeroBanner(id);
            } catch (e) {
                console.error(e);
                alert('삭제 실패');
                setIsSaving(false);
                return;
            } finally {
                setIsSaving(false);
            }
        }

        const newBanners = banners.filter(b => b.id !== id);
        setBanners(newBanners);
        if (editingBannerId === id) {
            setEditingBannerId(newBanners[0]?.id || null);
            setPreviewBannerIndex(0);
        }
    };

    // Preview Synchronize
    useEffect(() => {
        if (editingBannerId) {
            const index = banners.findIndex(b => b.id === editingBannerId);
            if (index !== -1) setPreviewBannerIndex(index);
        }
    }, [editingBannerId]);

    // ----------------------------------------------------------------------
    // Render
    // ----------------------------------------------------------------------

    const editingBanner = banners.find(b => b.id === editingBannerId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">배너 관리</h2>
                <p className="text-slate-500">
                    서비스 곳곳에 노출되는 배너와 광고를 관리합니다.
                </p>
            </div>

            {/* 탭 네비게이션 */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('hero')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'hero'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
                    >
                        히어로 배너
                    </button>
                    <button
                        onClick={() => setActiveTab('native')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'native'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
                    >
                        네이티브 배너 (준비중)
                    </button>
                </nav>
            </div>

            {/* 히어로 배너 탭 콘텐츠 */}
            {activeTab === 'hero' && config && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content (Left, 2 cols) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. 기본 설정 */}
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900">기본 설정</h3>
                                <button
                                    onClick={handleConfigSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                                >
                                    <IconDeviceFloppy size={16} /> 저장
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">배너 노출</span>
                                        <span className="text-xs text-slate-500">히어로 영역 전체 표시 여부</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.isActive}
                                            onChange={(e) => handleConfigChange('isActive', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">캐러셀 속도</span>
                                        <span className="text-xs text-slate-500">자동 전환 주기 (3~10초)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={3}
                                            max={10}
                                            value={config.rotationSpeed}
                                            onChange={(e) => handleConfigChange('rotationSpeed', Number(e.target.value))}
                                            className="w-16 px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <span className="text-sm text-slate-500">초</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. 배너 목록 및 편집 */}
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-900">배너 목록</h3>
                                <button
                                    onClick={handleAddBanner}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
                                >
                                    <IconPlus size={16} /> 새 배너 추가
                                </button>
                            </div>

                            {/* 목록 */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {banners.map((banner, index) => (
                                    <button
                                        key={banner.id}
                                        onClick={() => setEditingBannerId(banner.id)}
                                        className={`
                      relative group flex flex-col items-start p-3 rounded-lg border text-left transition-all min-w-[140px]
                      ${editingBannerId === banner.id
                                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                    `}
                                    >
                                        <span className={`text-xs font-bold mb-1 ${banner.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                            {banner.isActive ? '● 활성' : '○ 비활성'}
                                        </span>
                                        <span className="text-sm font-medium text-slate-900 line-clamp-1">
                                            {banner.title || '(제목 없음)'}
                                        </span>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconEdit size={14} className="text-slate-400" />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <hr className="my-6 border-slate-100" />

                            {/* 선택된 배너 편집 폼 */}
                            {editingBanner ? (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            배너 편집
                                            <span className="text-xs font-normal text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                                                {editingBanner.id.startsWith('temp') ? '신규 작성' : '기존 배너 수정'}
                                            </span>
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteBanner(editingBanner.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="삭제"
                                            >
                                                <IconTrash size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleBannerSave(editingBanner.id)}
                                                disabled={isSaving}
                                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                                            >
                                                <IconCheck size={16} /> 저장
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <span className="text-sm font-medium text-slate-700">이 배너 활성화</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={editingBanner.isActive}
                                                        onChange={(e) => handleBannerChange(editingBanner.id, 'isActive', e.target.checked)}
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                                </label>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">제목 (1줄)</label>
                                                <input
                                                    type="text"
                                                    value={editingBanner.title}
                                                    onChange={(e) => handleBannerChange(editingBanner.id, 'title', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    placeholder="공고와 선생님을 찾는"
                                                />
                                                <p className="mt-1 text-xs text-slate-500 flex justify-end">
                                                    <span className={editingBanner.title.length > 14 ? 'text-red-500 font-bold' : ''}>
                                                        {editingBanner.title.length}
                                                    </span> / 14자 권장
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">부제 (2줄)</label>
                                                <input
                                                    type="text"
                                                    value={editingBanner.subtitle || ''}
                                                    onChange={(e) => handleBannerChange(editingBanner.id, 'subtitle', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    placeholder="가장 쉬운 방법 - 쌤찾기"
                                                />
                                                <p className="mt-1 text-xs text-slate-500 flex justify-end">
                                                    <span className={(editingBanner.subtitle?.length || 0) > 14 ? 'text-red-500 font-bold' : ''}>
                                                        {editingBanner.subtitle?.length || 0}
                                                    </span> / 14자 권장
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">아이콘 (선택)</label>
                                                <select
                                                    value={editingBanner.icon || 'none'}
                                                    onChange={(e) => handleBannerChange(editingBanner.id, 'icon', e.target.value === 'none' ? undefined : e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                >
                                                    {ICON_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">배경색</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={editingBanner.bgColor}
                                                            onChange={(e) => handleBannerChange(editingBanner.id, 'bgColor', e.target.value)}
                                                            className="w-8 h-8 rounded cursor-pointer border border-slate-200 p-0.5"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editingBanner.bgColor}
                                                            onChange={(e) => handleBannerChange(editingBanner.id, 'bgColor', e.target.value)}
                                                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs uppercase"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">텍스트색</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={editingBanner.textColor}
                                                            onChange={(e) => handleBannerChange(editingBanner.id, 'textColor', e.target.value)}
                                                            className="w-8 h-8 rounded cursor-pointer border border-slate-200 p-0.5"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editingBanner.textColor}
                                                            onChange={(e) => handleBannerChange(editingBanner.id, 'textColor', e.target.value)}
                                                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs uppercase"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">링크 URL (선택)</label>
                                                <input
                                                    type="text"
                                                    value={editingBanner.linkUrl || ''}
                                                    onChange={(e) => handleBannerChange(editingBanner.id, 'linkUrl', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                                                    placeholder="https://"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                                    배너를 선택하거나 새로 추가해주세요.
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar (Right, 1 col) - Preview */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                {config && editingBanner ? (
                                    <HeroBannerPreview
                                        banners={banners}
                                        config={config}
                                        activeIndex={previewBannerIndex}
                                    />
                                ) : (
                                    <div className="text-center text-slate-400 py-10">미리보기 준비 중</div>
                                )}

                                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-2">
                                    <p className="font-bold border-b border-slate-200 pb-2 mb-2">도움말</p>
                                    <p>• 히어로 배너는 공고 목록 최상단에 고정됩니다.</p>
                                    <p>• 제목과 부제는 가급적 짧게(14자 이내) 작성해주세요.</p>
                                    <p>• 여러 개의 배너를 활성화하면 지정된 시간 간격으로 자동 회전됩니다.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* 네이티브 배너 탭 콘텐츠 */}
            {activeTab === 'native' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                    <IconLayoutBoard size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">준비 중입니다</h3>
                    <p className="text-slate-500 mt-2">네이티브 배너 관리 기능은 추후 업데이트될 예정입니다.</p>
                </div>
            )}
        </div>
    );
}
