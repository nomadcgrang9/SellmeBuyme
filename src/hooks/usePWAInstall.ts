import { useState, useEffect, useCallback } from 'react';
import {
    isKakaoTalk,
    isIOS,
    isAndroid,
    isMobile,
    isPWAInstalled,
    isTrueFirstVisit,
    markVisited,
    isDevNotePath,
    openInExternalBrowser,
    getCurrentURL,
    setDeferredPrompt,
    getDeferredPrompt,
    BeforeInstallPromptEvent,
    showInstallPrompt,
} from '@/lib/utils/pwaUtils';

// PWA 모달 표시 딜레이 (1분)
const PWA_PROMPT_DELAY = 60000;

export interface UsePWAInstallReturn {
    // 모달 상태
    showBrowserRedirectModal: boolean;  // 카톡 → 외부 브라우저 이동 안내
    showInstallModal: boolean;          // 앱 설치 모달
    showIOSGuide: boolean;
    showManualGuide: boolean;
    clipboardSuccess: boolean;

    // 설치 버튼 상태
    showInstallButton: boolean;

    // 핸들러
    handleBrowserRedirect: () => Promise<void>;
    handleBrowserRedirectDismiss: () => void;
    handleInstall: () => Promise<void>;
    handleInstallDismiss: () => void;
    handleIOSGuideDismiss: () => void;
    handleManualGuideDismiss: () => void;

    // 앱 정보
    appName: string;
    platform: 'ios' | 'android' | '';
    isKakao: boolean;
}

/**
 * PWA 설치 관련 상태 및 로직을 관리하는 훅
 *
 * 플로우:
 * 1. 카톡 인앱 브라우저: 15초 후 "외부 브라우저로 이동" 모달 → 이동 후 "앱 설치" 모달
 * 2. 일반 브라우저: 15초 후 "앱 설치" 모달
 * 3. from=kakao 파라미터: 카톡에서 넘어온 경우 즉시 "앱 설치" 모달
 */
export function usePWAInstall(): UsePWAInstallReturn {
    // 모달 상태
    const [showBrowserRedirectModal, setShowBrowserRedirectModal] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const [showManualGuide, setShowManualGuide] = useState(false);
    const [clipboardSuccess, setClipboardSuccess] = useState(false);

    // 설치 버튼 상태
    const [showInstallButton, setShowInstallButton] = useState(false);

    // 플랫폼 감지
    const [platform, setPlatform] = useState<'ios' | 'android' | ''>('');
    const [isKakao, setIsKakao] = useState(false);

    // 앱 이름 (경로별 분기)
    const appName = isDevNotePath() ? '개발자노트' : '학교일자리';

    // 플랫폼 초기화
    useEffect(() => {
        if (isIOS()) {
            setPlatform('ios');
        } else if (isAndroid()) {
            setPlatform('android');
        }
        setIsKakao(isKakaoTalk());
    }, []);

    // from=kakao 파라미터 감지 (카톡에서 외부 브라우저로 이동한 경우)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('from') === 'kakao' && !isKakaoTalk() && isMobile()) {
            // 카톡에서 넘어온 경우 → 설치 모달 즉시 표시
            setShowInstallModal(true);

            // 파라미터 제거 (URL 정리)
            params.delete('from');
            const cleanUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
            window.history.replaceState({}, '', cleanUrl);
        }
    }, []);

    // 15초 후 모달 표시 (최초 방문 시)
    useEffect(() => {
        // PWA가 이미 설치되어 있으면 아무것도 안 함
        if (isPWAInstalled()) {
            return;
        }

        // 모바일이 아니면 아무것도 안 함
        if (!isMobile()) {
            return;
        }

        // 최초 방문이 아니면 아무것도 안 함
        if (!isTrueFirstVisit()) {
            return;
        }

        // from=kakao로 이미 모달이 표시된 경우 스킵
        const params = new URLSearchParams(window.location.search);
        if (params.get('from') === 'kakao') {
            return;
        }

        // 15초 후 모달 표시
        const timer = setTimeout(() => {
            if (isKakaoTalk()) {
                // 카톡 인앱: 브라우저 이동 안내 모달
                setShowBrowserRedirectModal(true);
            } else {
                // 일반 브라우저: 설치 모달
                setShowInstallModal(true);
            }
        }, PWA_PROMPT_DELAY);

        return () => clearTimeout(timer);
    }, []);

    // beforeinstallprompt 이벤트 리스너
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // 브라우저 기본 설치 배너 차단
            e.preventDefault();

            // 이벤트 저장
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // 모바일 환경에서만 설치 버튼 표시
            if (isMobile()) {
                setShowInstallButton(true);
            }
        };

        const handleAppInstalled = () => {
            setShowInstallButton(false);
            setShowInstallModal(false);
            setDeferredPrompt(null);
            console.log('PWA가 성공적으로 설치되었습니다');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // 브라우저 이동 모달 - "외부 브라우저로 열기" 클릭
    const handleBrowserRedirect = useCallback(async () => {
        setShowBrowserRedirectModal(false);
        markVisited();

        // from=kakao 파라미터 추가하여 외부 브라우저에서 감지
        const currentUrl = getCurrentURL();
        const url = new URL(currentUrl);
        url.searchParams.set('from', 'kakao');
        const targetUrl = url.toString();

        if (platform === 'android') {
            // Android: Intent로 외부 브라우저 열기
            try {
                await openInExternalBrowser(targetUrl);
            } catch (error) {
                if (error === 'fallback_needed') {
                    setShowManualGuide(true);
                }
            }
        } else if (platform === 'ios') {
            // iOS: 클립보드 복사 + Safari 열기
            try {
                const result = await openInExternalBrowser(targetUrl);
                if (result === 'clipboard_success') {
                    setClipboardSuccess(true);
                }
                setShowIOSGuide(true);
            } catch (error) {
                if (error === 'clipboard_denied') {
                    setClipboardSuccess(false);
                    setShowIOSGuide(true);
                }
            }
        }
    }, [platform]);

    // 브라우저 이동 모달 - "나중에 할게요" 클릭
    const handleBrowserRedirectDismiss = useCallback(() => {
        setShowBrowserRedirectModal(false);
        markVisited();
    }, []);

    // 설치 모달 - "앱으로 설치하기" 클릭
    const handleInstall = useCallback(async () => {
        setShowInstallModal(false);
        markVisited();

        // beforeinstallprompt 이벤트가 있으면 네이티브 설치 프롬프트 표시
        const deferredPrompt = getDeferredPrompt();
        if (deferredPrompt) {
            const outcome = await showInstallPrompt();
            if (outcome === 'accepted') {
                console.log('사용자가 PWA 설치를 수락했습니다');
            } else {
                console.log('사용자가 PWA 설치를 거부했습니다');
            }
        } else if (platform === 'ios') {
            // iOS: Safari 홈 화면 추가 안내
            setShowIOSGuide(true);
        }
    }, [platform]);

    // 설치 모달 - "나중에 할게요" 클릭
    const handleInstallDismiss = useCallback(() => {
        setShowInstallModal(false);
        markVisited();
    }, []);

    // iOS 가이드 닫기
    const handleIOSGuideDismiss = useCallback(() => {
        setShowIOSGuide(false);
    }, []);

    // 수동 안내 모달 닫기
    const handleManualGuideDismiss = useCallback(() => {
        setShowManualGuide(false);
    }, []);

    return {
        showBrowserRedirectModal,
        showInstallModal,
        showIOSGuide,
        showManualGuide,
        clipboardSuccess,
        showInstallButton,
        handleBrowserRedirect,
        handleBrowserRedirectDismiss,
        handleInstall,
        handleInstallDismiss,
        handleIOSGuideDismiss,
        handleManualGuideDismiss,
        appName,
        platform,
        isKakao,
    };
}
