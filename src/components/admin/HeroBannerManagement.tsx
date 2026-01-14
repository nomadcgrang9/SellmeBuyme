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
    IconBriefcase,
    IconPhoto,
    IconLink,
    IconUpload,
    IconX
} from '@tabler/icons-react';
import {
    getHeroBannerConfig,
    getAllHeroBanners,
    updateHeroBannerConfig,
    createHeroBanner,
    updateHeroBanner,
    deleteHeroBanner,
    getNativeBannerConfig,
    getNativeBanners,
    updateNativeBannerConfig,
    createNativeBanner,
    updateNativeBanner,
    deleteNativeBanner as deleteNativeBannerApi,
    uploadNativeBannerImage
} from '@/lib/supabase/hero-banner';
import type { HeroBanner, HeroBannerConfig, NativeBanner, NativeBannerConfig } from '@/types/hero-banner';

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
    { value: 'none', label: '?ÜÏùå' },
    { value: 'search', label: '?ãÎ≥¥Í∏?(Í≤Ä??' },
    { value: 'school', label: '?ôÍµê' },
    { value: 'notice', label: '?ïÏÑ±Í∏?(Í≥µÏ?)' },
    { value: 'party', label: '??£Ω (?¥Î≤§??' },
    { value: 'bag', label: 'Í∞ÄÎ∞?(Ï±ÑÏö©)' },
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
    // ?§Ï†ú ?åÎçîÎßÅÎê† Î∞∞ÎÑà ?ÑÌÑ∞Îß?(?úÏÑ±?îÎêú Í≤ÉÎßå)
    // Í¥ÄÎ¶¨Ïûê Î™®Îìú?êÏÑú??Î™®Îì† Î∞∞ÎÑàÎ•?Î≥¥Ïó¨Ï£ºÎêò, ÎπÑÌôú?±Ìôî??Í≤ÉÏ? ?êÎ¶ø?òÍ≤å Ï≤òÎ¶¨?òÎäî ?±Ïùò UXÍ∞Ä ?ÑÏöî?????àÏùå
    // ?òÏ?Îß??¨Í∏∞?úÎäî ?†ÌÉù??Î∞∞ÎÑàÎ•?Î≥¥Ïó¨Ï£ºÍ±∞??Ï∫êÎü¨?Ä ?ôÏûë???úÎ??àÏù¥??

    const currentBanner = banners[activeIndex];

    if (!currentBanner) {
        return (
            <div className="w-[240px] h-[100px] bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                Î∞∞ÎÑàÍ∞Ä ?ÜÏäµ?àÎã§
            </div>
        );
    }

    // Í∏Ä????Ï≤¥ÌÅ¨
    const titleLen = currentBanner.title.length;
    const subtitleLen = currentBanner.subtitle?.length || 0;
    const isTitleOver = titleLen > 14;
    const isSubtitleOver = subtitleLen > 14;
    const isTotalOver = titleLen + subtitleLen > 30; // ?Ä?µÏ†Å??Í∏∞Ï?

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold">?§Ï†ú ?¨Í∏∞ ÎØ∏Î¶¨Î≥¥Í∏∞ (240px)</span>
                {currentBanner.isActive ? (
                    <span className="text-green-600 flex items-center gap-1"><IconCheck size={12} /> ?∏Ï∂ú Ï§?/span>
                ) : (
                    <span className="text-slate-400">ÎπÑÌôú?±Ìôî??/span>
                )}
            </div>

            {/* Î∞∞ÎÑà ÎØ∏Î¶¨Î≥¥Í∏∞ Ïª®ÌÖå?¥ÎÑà (?§Ï†ú Hero ?ÅÏó≠ ?úÎ??àÏù¥?? */}
            <div className="w-[240px] bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                {/* Hero Card ?ÅÏó≠ */}
                <div className="mx-0 my-0 flex-shrink-0">
                    <div
                        className="rounded-lg px-4 py-4 transition-all duration-300 relative overflow-hidden"
                        style={{ backgroundColor: currentBanner.bgColor }}
                    >
                        <div className="flex items-start gap-3">
                            {/* ?ÑÏù¥ÏΩ?*/}
                            {currentBanner.icon && ICON_MAP[currentBanner.icon] && (
                                <div style={{ color: currentBanner.textColor }} className="mt-0.5 flex-shrink-0">
                                    {ICON_MAP[currentBanner.icon]}
                                </div>
                            )}

                            {/* ?çÏä§??*/}
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

                        {/* ?∏ÎîîÏºÄ?¥ÌÑ∞ (Î∞∞ÎÑàÍ∞Ä 2Í∞??¥ÏÉÅ???? */}
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
                                {/* ?úÏÑ± ?∏ÎîîÏºÄ?¥ÌÑ∞ ??ñ¥?∞Í∏∞ ?úÎ??àÏù¥?òÏ? ?ùÎûµ?òÍ±∞???®Ïàú??Ï≤´Î≤àÏß∏Í∫º ÏßÑÌïòÍ≤?*/}
                                <div
                                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1"
                                >
                                    {/* ?§Ï†úÎ°úÎäî active index???∞Îùº ?§Î¶Ñ */}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Í≤ΩÍ≥† Î©îÏãúÏßÄ */}
            {(isTitleOver || isSubtitleOver || isTotalOver) && (
                <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    <IconExclamationCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">?çÏä§??Í∏∏Ïù¥ Ï£ºÏùò</p>
                        <p>Î™®Î∞î???îÎ©¥?êÏÑú Ï§ÑÎ∞îÍøàÏù¥ Í≥ºÎèÑ?òÍ≤å Î∞úÏÉù?????àÏäµ?àÎã§.</p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5 opacity-80">
                            {isTitleOver && <li>?úÎ™©??14?êÎ? Ï¥àÍ≥º??({titleLen}??</li>}
                            {isSubtitleOver && <li>Î∂Ä?úÍ? 14?êÎ? Ï¥àÍ≥º??({subtitleLen}??</li>}
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

    // Native Banner State
    const [nativeConfig, setNativeConfig] = useState<NativeBannerConfig | null>(null);
    const [nativeBanners, setNativeBanners] = useState<NativeBanner[]>([]);
    const [editingNativeId, setEditingNativeId] = useState<string | null>(null);

    const handleNativeConfigChange = async (key: string, value: any) => {
        if (!nativeConfig) return;
        const updated = { ...nativeConfig, [key]: value };
        setNativeConfig(updated);
        // Debounce ?ÜÏù¥ Ï¶âÏãú ?Ä??(Í∞ÑÎã®??Íµ¨ÌòÑ)
        try {
            await updateNativeBannerConfig({ isActive: updated.isActive, insertionInterval: updated.insertionInterval });
        } catch (e) {
            console.error('Failed to update native config:', e);
        }
    };

    const handleAddNativeBanner = async () => {
        try {
            const created = await createNativeBanner({
                imageUrl: '',
                linkUrl: '',
                displayOrder: nativeBanners.length,
                isActive: true
            });
            if (created) {
                setNativeBanners(prev => [...prev, created]);
                setEditingNativeId(created.id);
            }
        } catch (e) {
            console.error('Failed to create native banner:', e);
            alert('Î∞∞ÎÑà Ï∂îÍ? ?§Ìå®');
        }
    };

    const handleDeleteNativeBanner = async (id: string) => {
        if (!window.confirm('?ïÎßê ??†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) return;
        try {
            const success = await deleteNativeBannerApi(id);
            if (success) {
                setNativeBanners(prev => prev.filter(b => b.id !== id));
                if (editingNativeId === id) setEditingNativeId(null);
            }
        } catch (e) {
            console.error('Failed to delete native banner:', e);
            alert('??†ú ?§Ìå®');
        }
    };

    const handleNativeBannerChange = async (id: string, field: string, value: any) => {
        // Î°úÏª¨ ?ÅÌÉú Î®ºÏ? ?ÖÎç∞?¥Ìä∏ (Ï¶âÍ∞Å?ÅÏù∏ UI Î∞òÏòÅ)
        setNativeBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
        // DB ?ÖÎç∞?¥Ìä∏
        try {
            await updateNativeBanner(id, { [field]: value });
        } catch (e) {
            console.error('Failed to update native banner:', e);
        }
    };

    const handleNativeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, bannerId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsSaving(true);
            const publicUrl = await uploadNativeBannerImage(file);
            if (publicUrl) {
                await handleNativeBannerChange(bannerId, 'imageUrl', publicUrl);
            } else {
                alert('?¥Î?ÏßÄ ?ÖÎ°ú???§Ìå®');
            }
        } catch (error) {
            console.error('Upload failed', error);
            alert('?¥Î?ÏßÄ ?ÖÎ°ú???§Ìå®');
        } finally {
            setIsSaving(false);
        }
    };

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [configData, bannersData, nativeConfigData, nativeBannersData] = await Promise.all([
                getHeroBannerConfig(),
                getAllHeroBanners(),
                getNativeBannerConfig(),
                getNativeBanners()
            ]);

            // Hero Banner Config
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

            // Native Banner Config
            setNativeConfig(nativeConfigData || {
                id: '',
                isActive: true,
                insertionInterval: 5,
                createdAt: '',
                updatedAt: ''
            });
            setNativeBanners(nativeBannersData);

            if (nativeBannersData.length > 0) {
                setEditingNativeId(nativeBannersData[0].id);
            }
        } catch (e) {
            console.error(e);
            alert('?∞Ïù¥?∞Î? Î∂àÎü¨?§Îäî Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.');
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
            alert('?§Ï†ï???Ä?•Îêò?àÏäµ?àÎã§.');
        } catch (e) {
            console.error(e);
            alert('?Ä???§Ìå®');
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

        // ?†Ìö®??Í≤Ä??
        if (!banner.title.trim()) {
            alert('?úÎ™©???ÖÎ†•?¥Ï£º?∏Ïöî.');
            return;
        }

        setIsSaving(true);
        try {
            if (id.startsWith('temp-')) {
                // ?ùÏÑ±
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
                // ?òÏ†ï
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
            alert('Î∞∞ÎÑàÍ∞Ä ?Ä?•Îêò?àÏäµ?àÎã§.');
        } catch (e) {
            console.error(e);
            alert('?Ä???§Ìå®');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddBanner = () => {
        const newBanner: HeroBanner = {
            id: `temp-${Date.now()}`,
            title: '??Î∞∞ÎÑà',
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
        setPreviewBannerIndex(banners.length); // ÎßàÏ?ÎßâÏúºÎ°??¥Îèô
    };

    const handleDeleteBanner = async (id: string) => {
        if (!window.confirm('?ïÎßê ??†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) return;

        if (!id.startsWith('temp-')) {
            setIsSaving(true);
            try {
                await deleteHeroBanner(id);
            } catch (e) {
                console.error(e);
                alert('??†ú ?§Ìå®');
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
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Î∞∞ÎÑà Í¥ÄÎ¶?/h2>
                <p className="text-slate-500">
                    ?úÎπÑ??Í≥≥Í≥≥???∏Ï∂ú?òÎäî Î∞∞ÎÑà?Ä Í¥ëÍ≥†Î•?Í¥ÄÎ¶¨Ìï©?àÎã§.
                </p>
            </div>

            {/* ???§ÎπÑÍ≤åÏù¥??(Pill Style) */}
            <div className="flex items-center gap-2 mb-2">
                <button
                    onClick={() => setActiveTab('hero')}
                    className={`
                        rounded-full border px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2
                        ${activeTab === 'hero'
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}
                    `}
                >
                    <IconLayoutBoard size={16} />
                    ?àÏñ¥Î°?Î∞∞ÎÑà
                </button>
                <button
                    onClick={() => setActiveTab('native')}
                    className={`
                        rounded-full border px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2
                        ${activeTab === 'native'
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}
                    `}
                >
                    <IconPhoto size={16} />
                    ?§Ïù¥?∞Î∏å Î∞∞ÎÑà
                </button>
            </div>
            {/* Íµ¨Î∂Ñ???úÍ±∞ */}

            {/* ?àÏñ¥Î°?Î∞∞ÎÑà ??ÏΩòÌÖêÏ∏?*/}
            {activeTab === 'hero' && config && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content (Left, 2 cols) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Í∏∞Î≥∏ ?§Ï†ï */}
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900">Í∏∞Î≥∏ ?§Ï†ï</h3>
                                <button
                                    onClick={handleConfigSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                                >
                                    <IconDeviceFloppy size={16} /> ?Ä??
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">Î∞∞ÎÑà ?∏Ï∂ú</span>
                                        <span className="text-xs text-slate-500">?àÏñ¥Î°??ÅÏó≠ ?ÑÏ≤¥ ?úÏãú ?¨Î?</span>
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
                                        <span className="text-sm font-medium text-slate-900">Ï∫êÎü¨?Ä ?çÎèÑ</span>
                                        <span className="text-xs text-slate-500">?êÎèô ?ÑÌôò Ï£ºÍ∏∞ (3~10Ï¥?</span>
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
                                        <span className="text-sm text-slate-500">Ï¥?/span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Î∞∞ÎÑà Î™©Î°ù Î∞??∏Ïßë */}
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-900">Î∞∞ÎÑà Î™©Î°ù</h3>
                                <button
                                    onClick={handleAddBanner}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
                                >
                                    <IconPlus size={16} /> ??Î∞∞ÎÑà Ï∂îÍ?
                                </button>
                            </div>

                            {/* Î™©Î°ù */}
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
                                            {banner.isActive ? '???úÏÑ±' : '??ÎπÑÌôú??}
                                        </span>
                                        <span className="text-sm font-medium text-slate-900 line-clamp-1">
                                            {banner.title || '(?úÎ™© ?ÜÏùå)'}
                                        </span>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconEdit size={14} className="text-slate-400" />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <hr className="my-6 border-slate-100" />

                            {/* ?†ÌÉù??Î∞∞ÎÑà ?∏Ïßë ??*/}
                            {editingBanner ? (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                            Î∞∞ÎÑà ?∏Ïßë
                                            <span className="text-xs font-normal text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                                                {editingBanner.id.startsWith('temp') ? '?†Í∑ú ?ëÏÑ±' : 'Í∏∞Ï°¥ Î∞∞ÎÑà ?òÏ†ï'}
                                            </span>
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteBanner(editingBanner.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="??†ú"
                                            >
                                                <IconTrash size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleBannerSave(editingBanner.id)}
                                                disabled={isSaving}
                                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                                            >
                                                <IconCheck size={16} /> ?Ä??
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <span className="text-sm font-medium text-slate-700">??Î∞∞ÎÑà ?úÏÑ±??/span>
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
                                                <label className="block text-sm font-medium text-slate-700 mb-1">?úÎ™© (1Ï§?</label>
                                                <input
                                                    type="text"
                                                    value={editingBanner.title}
                                                    onChange={(e) => handleBannerChange(editingBanner.id, 'title', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    placeholder="Í≥µÍ≥†?Ä ?†ÏÉù?òÏùÑ Ï∞æÎäî"
                                                />
                                                <p className="mt-1 text-xs text-slate-500 flex justify-end">
                                                    <span className={editingBanner.title.length > 14 ? 'text-red-500 font-bold' : ''}>
                                                        {editingBanner.title.length}
                                                    </span> / 14??Í∂åÏû•
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Î∂Ä??(2Ï§?</label>
                                                <input
                                                    type="text"
                                                    value={editingBanner.subtitle || ''}
                                                    onChange={(e) => handleBannerChange(editingBanner.id, 'subtitle', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    placeholder="Í∞Ä???¨Ïö¥ Î∞©Î≤ï - ?§Ï∞æÍ∏?
                                                />
                                                <p className="mt-1 text-xs text-slate-500 flex justify-end">
                                                    <span className={(editingBanner.subtitle?.length || 0) > 14 ? 'text-red-500 font-bold' : ''}>
                                                        {editingBanner.subtitle?.length || 0}
                                                    </span> / 14??Í∂åÏû•
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">?ÑÏù¥ÏΩ?(?†ÌÉù)</label>
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
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Î∞∞Í≤Ω??/label>
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
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">?çÏä§?∏ÏÉâ</label>
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
                                                <label className="block text-sm font-medium text-slate-700 mb-1">ÎßÅÌÅ¨ URL (?†ÌÉù)</label>
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
                                    Î∞∞ÎÑàÎ•??†ÌÉù?òÍ±∞???àÎ°ú Ï∂îÍ??¥Ï£º?∏Ïöî.
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
                                    <div className="text-center text-slate-400 py-10">ÎØ∏Î¶¨Î≥¥Í∏∞ Ï§ÄÎπ?Ï§?/div>
                                )}

                                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-2">
                                    <p className="font-bold border-b border-slate-200 pb-2 mb-2">?ÑÏ?Îß?/p>
                                    <p>???àÏñ¥Î°?Î∞∞ÎÑà??Í≥µÍ≥† Î™©Î°ù ÏµúÏÉÅ?®Ïóê Í≥†Ï†ï?©Îãà??</p>
                                    <p>???úÎ™©Í≥?Î∂Ä?úÎäî Í∞ÄÍ∏âÏ†Å ÏßßÍ≤å(14???¥ÎÇ¥) ?ëÏÑ±?¥Ï£º?∏Ïöî.</p>
                                    <p>???¨Îü¨ Í∞úÏùò Î∞∞ÎÑàÎ•??úÏÑ±?îÌïòÎ©?ÏßÄ?ïÎêú ?úÍ∞Ñ Í∞ÑÍ≤©?ºÎ°ú ?êÎèô ?åÏ†Ñ?©Îãà??</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* ?§Ïù¥?∞Î∏å Î∞∞ÎÑà ??ÏΩòÌÖêÏ∏?*/}
            {activeTab === 'native' && nativeConfig && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* ?§Ï†ï Î∞?Î™©Î°ù (Left) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Í∏∞Î≥∏ ?§Ï†ï */}
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Í∏∞Î≥∏ ?§Ï†ï</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">?§Ïù¥?∞Î∏å Î∞∞ÎÑà ?∏Ï∂ú</span>
                                        <span className="text-xs text-slate-500">Í≥µÍ≥† Î™©Î°ù ?¨Ïù¥ ?ΩÏûÖ ?¨Î?</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={nativeConfig.isActive}
                                            onChange={(e) => handleNativeConfigChange('isActive', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">?∏Ï∂ú Ï£ºÍ∏∞</span>
                                        <span className="text-xs text-slate-500">Î™?Î≤àÏß∏ Í≥µÍ≥†ÎßàÎã§ ?∏Ï∂ú?†Ï? ?§Ï†ï</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">Îß?/span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={nativeConfig.insertionInterval}
                                            onChange={(e) => handleNativeConfigChange('insertionInterval', Number(e.target.value))}
                                            className="w-16 px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-center"
                                        />
                                        <span className="text-sm text-slate-600">Î≤àÏß∏</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Î∞∞ÎÑà Î™©Î°ù Î∞??∏Ïßë */}
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-900">Î∞∞ÎÑà Î™©Î°ù</h3>
                                <button
                                    onClick={handleAddNativeBanner}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
                                >
                                    <IconPlus size={16} /> Î∞∞ÎÑà Ï∂îÍ?
                                </button>
                            </div>

                            {/* Î™©Î°ù */}
                            <div className="space-y-3 mb-6">
                                {nativeBanners.map((banner) => (
                                    <div
                                        key={banner.id}
                                        onClick={() => setEditingNativeId(banner.id)}
                                        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all
                                            ${editingNativeId === banner.id
                                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                : 'border-slate-200 hover:bg-slate-50'}
                                        `}
                                    >
                                        <div className="w-16 h-10 bg-slate-200 rounded flex-shrink-0 overflow-hidden flex items-center justify-center text-slate-400">
                                            {banner.imageUrl ? (
                                                <img src={banner.imageUrl} alt="thumbnail" className="w-full h-full object-cover" />
                                            ) : (
                                                <IconPhoto size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {banner.linkUrl || '(ÎßÅÌÅ¨ ?ÜÏùå)'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {banner.isActive ? '?∏Ï∂ú Ï§? : 'ÎπÑÌôú??}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteNativeBanner(banner.id); }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                                        >
                                            <IconTrash size={16} />
                                        </button>
                                    </div>
                                ))}

                                {nativeBanners.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                                        ?±Î°ù???§Ïù¥?∞Î∏å Î∞∞ÎÑàÍ∞Ä ?ÜÏäµ?àÎã§.
                                    </div>
                                )}
                            </div>

                            <hr className="my-6 border-slate-100" />

                            {/* ?∏Ïßë ??*/}
                            {editingNativeId ? (
                                (() => {
                                    const banner = nativeBanners.find(b => b.id === editingNativeId);
                                    if (!banner) return null;
                                    return (
                                        <div className="space-y-6 animate-fadeIn">
                                            <h4 className="text-base font-bold text-slate-800">Î∞∞ÎÑà ?∏Ïßë</h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Î∞∞ÎÑà ?¥Î?ÏßÄ</label>
                                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition cursor-pointer">
                                                            <div className="space-y-1 text-center">
                                                                {banner.imageUrl ? (
                                                                    <div className="relative group">
                                                                        <img src={banner.imageUrl} alt="preview" className="max-h-32 mx-auto rounded" />
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleNativeBannerChange(banner.id, 'imageUrl', '');
                                                                            }}
                                                                            className="absolute top-1 right-1 p-1 bg-white rounded-full shadow text-red-500 opacity-0 group-hover:opacity-100 transition"
                                                                        >
                                                                            <IconTrash size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <IconUpload className="mx-auto h-12 w-12 text-slate-400" />
                                                                        <div className="flex text-sm text-slate-600 justify-center">
                                                                            <span className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                                                <span>?åÏùº ?ÖÎ°ú??/span>
                                                                                <input type="file" accept="image/*" onChange={(e) => handleNativeImageUpload(e, banner.id)} className="sr-only" />
                                                                            </span>
                                                                            <p className="pl-1">?êÎäî ?úÎûòÍ∑????úÎ°≠</p>
                                                                        </div>
                                                                        <p className="text-xs text-slate-500">PNG, JPG, GIF up to 2MB</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                        <span className="text-sm font-medium text-slate-700">?úÏÑ±??/span>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={banner.isActive}
                                                                onChange={(e) => handleNativeBannerChange(banner.id, 'isActive', e.target.checked)}
                                                            />
                                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">?∞Í≤∞ ÎßÅÌÅ¨ URL</label>
                                                        <div className="flex items-center">
                                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                                                                <IconLink size={16} />
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={banner.linkUrl}
                                                                onChange={(e) => handleNativeBannerChange(banner.id, 'linkUrl', e.target.value)}
                                                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-slate-300 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                                placeholder="https://example.com"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : null}
                        </section>
                    </div>

                    {/* Preview (Right) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <h3 className="text-sm font-bold text-slate-900 mb-3">ÎØ∏Î¶¨Î≥¥Í∏∞ ?àÏãú</h3>
                                <div className="space-y-3">
                                    {/* Í∞ÄÏß?Í≥µÍ≥† Ïπ¥Îìú??*/}
                                    <div className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm opacity-50">
                                        <div className="h-3 w-3/4 bg-slate-100 rounded mb-2"></div>
                                        <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                                    </div>

                                    {/* ?§Ïù¥?∞Î∏å Î∞∞ÎÑà ÎØ∏Î¶¨Î≥¥Í∏∞ */}
                                    {editingNativeId && (() => {
                                        const banner = nativeBanners.find(b => b.id === editingNativeId);
                                        if (!banner || !banner.isActive) return null;
                                        return (
                                            <div className="relative overflow-hidden rounded-lg border border-transparent shadow-sm hover:shadow transition-all group">
                                                {banner.imageUrl ? (
                                                    <img src={banner.imageUrl} className="w-full h-32 object-cover" alt="Banner" />
                                                ) : (
                                                    <div className="w-full h-32 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                                                        <IconPhoto size={24} className="mb-1" />
                                                        <span className="text-xs">?¥Î?ÏßÄ ?ÜÏùå</span>
                                                    </div>
                                                )}
                                                {banner.linkUrl && (
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                                                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-700 text-xs px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                                            <IconLink size={12} /> ÎßÅÌÅ¨ ?¥Îèô
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-black/20 text-white text-[10px] px-1.5 py-0.5 rounded">Ad</div>
                                            </div>
                                        );
                                    })()}

                                    <div className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm opacity-50">
                                        <div className="h-3 w-2/3 bg-slate-100 rounded mb-2"></div>
                                        <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg">
                                    Î™©Î°ù ?¨Ïù¥???êÏó∞?§ÎüΩÍ≤?Î∞∞Ïπò?©Îãà??
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
