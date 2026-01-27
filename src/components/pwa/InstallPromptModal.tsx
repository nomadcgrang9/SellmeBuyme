import { Smartphone } from 'lucide-react';
import './FirstVisitInstallPrompt.css';

interface InstallPromptModalProps {
    isOpen: boolean;
    onInstall: () => void;
    onDismiss: () => void;
    appName?: string;
}

/**
 * PWA 앱 설치 유도 모달
 * 일반 브라우저에서 15초 후 또는 카톡에서 이동 후 표시
 */
function InstallPromptModal({
    isOpen,
    onInstall,
    onDismiss,
    appName = '학교일자리',
}: InstallPromptModalProps) {
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
                    앱으로 설치하세요!
                </h2>

                <ul className="pwa-benefits-list">
                    <li>📱 홈 화면에서 바로 접속</li>
                    <li>⚡ 앱처럼 빠르게 실행</li>
                    <li>🔔 새로운 공고 알림 (준비 중)</li>
                </ul>

                <button className="pwa-primary-button" onClick={onInstall}>
                    앱으로 설치하기
                    <span className="pwa-arrow">→</span>
                </button>

                <button className="pwa-secondary-button" onClick={onDismiss}>
                    나중에 할게요
                </button>
            </div>
        </div>
    );
}

export default InstallPromptModal;
