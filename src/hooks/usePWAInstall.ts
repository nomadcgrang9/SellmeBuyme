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
} from '@/lib/utils/pwaUtils';

export interface UsePWAInstallReturn {
    // 모달 상태
    showFirstVisitModal: boolean;
    showIOSGuide: boolean;
    showManualGuide: boolean;
    clipboardSuccess: boolean;

    // 설치 버튼 상태
    showInstallButton: boolean;

    // 핸들러
    handleFirstVisitInstall: () => Promise<void>;
    handleFirstVisitDismiss: () => void;
    handleIOSGuideDismiss: () => void;
    handleManualGuideDismiss: () => void;

    // 앱 정보
    appName: string;
    platform: 'ios' | 'android' | '';
}

/**
 * PWA 설치 관련 상태 및 로직을 관리하는 훅
 * 참조: LID 프로젝트 (frontend/src/components/Layout.jsx)
 */
export function usePWAInstall(): UsePWAInstallReturn {
    // 모달 상태
    const [showFirstVisitModal, setShowFirstVisitModal] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const [showManualGuide, setShowManualGuide] = useState(false);
    const [clipboardSuccess, setClipboardSuccess] = useState(false);

    // 설치 버튼 상태
    const [showInstallButton, setShowInstallButton] = useState(false);

    // 플랫폼 감지
    const [platform, setPlatform] = useState<'ios' | 'android' | ''>('');

    // 앱 이름 (경로별 분기)
    const appName = isDevNotePath() ? '개발자노트' : '학교일자리';

    // 환경 감지 및 최초 방문 모달 표시
    useEffect(() => {
        // PWA가 이미 설치되어 있으면 아무것도 안 함
        if (isPWAInstalled()) {
            return;
        }

        // 모바일이 아니면 아무것도 안 함
        if (!isMobile()) {
            return;
        }

        // 카카오톡 브라우저이고 최초 방문이면 모달 표시
        if (isKakaoTalk() && isTrueFirstVisit()) {
            setShowFirstVisitModal(true);

            // 플랫폼 감지
            if (isIOS()) {
                setPlatform('ios');
            } else if (isAndroid()) {
                setPlatform('android');
            }
        }
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

    // 최초 방문 모달 - 설치하기 클릭
    const handleFirstVisitInstall = useCallback(async () => {
        setShowFirstVisitModal(false);
        markVisited();

        if (platform === 'android') {
            // Android: Intent로 외부 브라우저 열기
            try {
                await openInExternalBrowser(getCurrentURL());
                // 성공 - 외부 브라우저로 이동됨
            } catch (error) {
                // 실패 - 수동 안내 모달 표시
                if (error === 'fallback_needed') {
                    setShowManualGuide(true);
                }
            }
        } else if (platform === 'ios') {
            // iOS: 클립보드 복사 + Safari 열기
            try {
                const result = await openInExternalBrowser(getCurrentURL());
                if (result === 'clipboard_success') {
                    setClipboardSuccess(true);
                }
                setShowIOSGuide(true);
            } catch (error) {
                // 클립보드 실패 - 수동 복사 필요
                if (error === 'clipboard_denied') {
                    setClipboardSuccess(false);
                    setShowIOSGuide(true);
                }
            }
        }
    }, [platform]);

    // 최초 방문 모달 - 나중에 할게요 클릭
    const handleFirstVisitDismiss = useCallback(() => {
        setShowFirstVisitModal(false);
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
        showFirstVisitModal,
        showIOSGuide,
        showManualGuide,
        clipboardSuccess,
        showInstallButton,
        handleFirstVisitInstall,
        handleFirstVisitDismiss,
        handleIOSGuideDismiss,
        handleManualGuideDismiss,
        appName,
        platform,
    };
}
