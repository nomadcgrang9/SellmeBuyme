import { ReactNode } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
    FirstVisitInstallPrompt,
    IOSInstallGuide,
    ManualBrowserGuide,
    InstallButton,
} from '@/components/pwa';

interface PWAProviderProps {
    children: ReactNode;
    /** 헤더에 설치 버튼을 표시할 위치 (선택) */
    renderInstallButton?: (button: ReactNode) => ReactNode;
}

/**
 * PWA 설치 관련 모달과 로직을 제공하는 래퍼 컴포넌트
 * 사용 방법:
 * 
 * <PWAProvider>
 *   <YourApp />
 * </PWAProvider>
 * 
 * 또는 헤더에 설치 버튼을 커스텀 위치에 렌더링:
 * 
 * <PWAProvider
 *   renderInstallButton={(button) => (
 *     <header>
 *       {button}
 *     </header>
 *   )}
 * >
 *   <YourApp />
 * </PWAProvider>
 */
function PWAProvider({ children, renderInstallButton }: PWAProviderProps) {
    const {
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
    } = usePWAInstall();

    // 설치 버튼 컴포넌트
    const installButtonElement = showInstallButton ? <InstallButton /> : null;

    return (
        <>
            {/* 커스텀 설치 버튼 렌더링 (옵션) */}
            {renderInstallButton && renderInstallButton(installButtonElement)}

            {/* 메인 콘텐츠 */}
            {children}

            {/* PWA 설치 모달들 */}
            <FirstVisitInstallPrompt
                isOpen={showFirstVisitModal}
                onInstall={handleFirstVisitInstall}
                onDismiss={handleFirstVisitDismiss}
                appName={appName}
            />

            <IOSInstallGuide
                isOpen={showIOSGuide}
                clipboardSuccess={clipboardSuccess}
                onDismiss={handleIOSGuideDismiss}
            />

            <ManualBrowserGuide
                isOpen={showManualGuide}
                onDismiss={handleManualGuideDismiss}
            />
        </>
    );
}

export default PWAProvider;
