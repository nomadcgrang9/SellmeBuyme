import { ReactNode } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
    BrowserRedirectModal,
    InstallPromptModal,
    IOSInstallGuide,
    ManualBrowserGuide,
    AndroidInstallGuide,
    InstallButton,
} from '@/components/pwa';

interface PWAProviderProps {
    children: ReactNode;
    /** 헤더에 설치 버튼을 표시할 위치 (선택) */
    renderInstallButton?: (button: ReactNode) => ReactNode;
}

/**
 * PWA 설치 관련 모달과 로직을 제공하는 래퍼 컴포넌트
 *
 * 플로우:
 * 1. 카톡 인앱 브라우저: 15초 후 "외부 브라우저로 이동" 모달 → 이동 후 "앱 설치" 모달
 * 2. 일반 브라우저: 15초 후 "앱 설치" 모달
 * 3. from=kakao 파라미터: 카톡에서 넘어온 경우 즉시 "앱 설치" 모달
 */
function PWAProvider({ children, renderInstallButton }: PWAProviderProps) {
    const {
        showBrowserRedirectModal,
        showInstallModal,
        showIOSGuide,
        showManualGuide,
        showAndroidGuide,
        clipboardSuccess,
        showInstallButton,
        handleBrowserRedirect,
        handleBrowserRedirectDismiss,
        handleInstall,
        handleInstallDismiss,
        handleIOSGuideDismiss,
        handleManualGuideDismiss,
        handleAndroidGuideDismiss,
        appName,
    } = usePWAInstall();

    // 설치 버튼 컴포넌트
    const installButtonElement = showInstallButton ? <InstallButton /> : null;

    return (
        <>
            {/* 커스텀 설치 버튼 렌더링 (옵션) */}
            {renderInstallButton && renderInstallButton(installButtonElement)}

            {/* 메인 콘텐츠 */}
            {children}

            {/* 카톡 → 외부 브라우저 이동 안내 모달 */}
            <BrowserRedirectModal
                isOpen={showBrowserRedirectModal}
                onRedirect={handleBrowserRedirect}
                onDismiss={handleBrowserRedirectDismiss}
                appName={appName}
            />

            {/* PWA 앱 설치 모달 */}
            <InstallPromptModal
                isOpen={showInstallModal}
                onInstall={handleInstall}
                onDismiss={handleInstallDismiss}
                appName={appName}
            />

            {/* iOS Safari 홈 화면 추가 안내 */}
            <IOSInstallGuide
                isOpen={showIOSGuide}
                clipboardSuccess={clipboardSuccess}
                onDismiss={handleIOSGuideDismiss}
            />

            {/* 수동 브라우저 이동 안내 (카톡) */}
            <ManualBrowserGuide
                isOpen={showManualGuide}
                onDismiss={handleManualGuideDismiss}
            />

            {/* Android 수동 설치 안내 */}
            <AndroidInstallGuide
                isOpen={showAndroidGuide}
                onDismiss={handleAndroidGuideDismiss}
                appName={appName}
            />
        </>
    );
}

export default PWAProvider;
