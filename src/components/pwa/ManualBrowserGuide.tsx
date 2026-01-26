import { MoreVertical, ExternalLink, Smartphone } from 'lucide-react';
import './ManualBrowserGuide.css';

interface ManualBrowserGuideProps {
    isOpen: boolean;
    onDismiss: () => void;
}

/**
 * Android 카카오톡에서 외부 브라우저로 열기 안내 모달
 * 참조: LID 프로젝트 (frontend/src/components/modals/ManualBrowserGuide.jsx)
 */
function ManualBrowserGuide({ isOpen, onDismiss }: ManualBrowserGuideProps) {
    if (!isOpen) return null;

    return (
        <div className="pwa-modal-overlay" onClick={onDismiss}>
            <div
                className="pwa-modal-content manual-guide-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="pwa-modal-title">자동으로 열리지 않나요?</h2>

                <p className="pwa-modal-description">
                    카카오톡 브라우저에서는 앱 설치가
                    <br />
                    지원되지 않아요
                </p>

                <div className="guide-section">
                    <h3 className="guide-title">
                        <Smartphone size={20} />
                        다른 브라우저로 열기
                    </h3>

                    <div className="guide-steps">
                        <div className="guide-step">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <MoreVertical size={18} className="step-icon" />
                                <span>오른쪽 상단 [...] 메뉴 터치</span>
                            </div>
                        </div>

                        <div className="guide-step">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <ExternalLink size={18} className="step-icon" />
                                <span>&quot;다른 브라우저에서 열기&quot; 선택</span>
                            </div>
                        </div>

                        <div className="guide-step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <Smartphone size={18} className="step-icon" />
                                <span>Chrome 또는 Samsung Internet 선택</span>
                            </div>
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

export default ManualBrowserGuide;
