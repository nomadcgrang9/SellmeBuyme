import { MoreVertical, Download, Smartphone } from 'lucide-react';
import './FirstVisitInstallPrompt.css';

interface AndroidInstallGuideProps {
    isOpen: boolean;
    onDismiss: () => void;
    appName?: string;
}

/**
 * Android 브라우저에서 PWA 수동 설치 안내 모달
 * beforeinstallprompt 이벤트를 받지 못한 경우 표시
 */
function AndroidInstallGuide({
    isOpen,
    onDismiss,
    appName = '학교일자리',
}: AndroidInstallGuideProps) {
    if (!isOpen) return null;

    return (
        <div className="pwa-modal-overlay" onClick={onDismiss}>
            <div
                className="pwa-modal-content first-visit-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="pwa-modal-icon">
                    <Smartphone size={48} />
                </div>

                <h2 className="pwa-modal-title">
                    {appName}를
                    <br />
                    홈 화면에 추가하세요!
                </h2>

                <div className="pwa-guide-steps">
                    <div className="pwa-guide-step">
                        <div className="pwa-step-number">1</div>
                        <div className="pwa-step-content">
                            <MoreVertical size={18} className="pwa-step-icon" />
                            <span>브라우저 메뉴 (⋮) 터치</span>
                        </div>
                    </div>

                    <div className="pwa-guide-step">
                        <div className="pwa-step-number">2</div>
                        <div className="pwa-step-content">
                            <Download size={18} className="pwa-step-icon" />
                            <span>"홈 화면에 추가" 또는 "앱 설치" 선택</span>
                        </div>
                    </div>

                    <div className="pwa-guide-step">
                        <div className="pwa-step-number">3</div>
                        <div className="pwa-step-content">
                            <Smartphone size={18} className="pwa-step-icon" />
                            <span>홈 화면에서 앱처럼 실행!</span>
                        </div>
                    </div>
                </div>

                <button className="pwa-primary-button" onClick={onDismiss}>
                    알겠어요
                </button>
            </div>
        </div>
    );
}

export default AndroidInstallGuide;
