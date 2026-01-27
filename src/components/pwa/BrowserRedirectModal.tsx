import { ExternalLink } from 'lucide-react';
import './FirstVisitInstallPrompt.css';

interface BrowserRedirectModalProps {
    isOpen: boolean;
    onRedirect: () => void;
    onDismiss: () => void;
    appName?: string;
}

/**
 * 카카오톡 인앱 브라우저 → 외부 브라우저 이동 안내 모달
 */
function BrowserRedirectModal({
    isOpen,
    onRedirect,
    onDismiss,
    appName = '학교일자리',
}: BrowserRedirectModalProps) {
    if (!isOpen) return null;

    return (
        <div className="pwa-modal-overlay" onClick={onDismiss}>
            <div
                className="pwa-modal-content first-visit-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="pwa-modal-icon">
                    <ExternalLink size={48} />
                </div>

                <h2 className="pwa-modal-title">
                    더 나은 경험을 위해
                    <br />
                    외부 브라우저에서 열어보세요
                </h2>

                <ul className="pwa-benefits-list">
                    <li>📲 앱으로 설치 가능</li>
                    <li>⚡ 더 빠른 로딩 속도</li>
                    <li>🔔 새 공고 알림 (준비 중)</li>
                </ul>

                <button className="pwa-primary-button" onClick={onRedirect}>
                    Chrome으로 열기
                    <span className="pwa-arrow">→</span>
                </button>

                <button className="pwa-secondary-button" onClick={onDismiss}>
                    나중에 할게요
                </button>
            </div>
        </div>
    );
}

export default BrowserRedirectModal;
