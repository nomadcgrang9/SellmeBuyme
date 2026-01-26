import { useState } from 'react';
import { Search, Share2, PlusSquare, Check, Copy } from 'lucide-react';
import { getCurrentURL, copyToClipboard } from '@/lib/utils/pwaUtils';
import './IOSInstallGuide.css';

interface IOSInstallGuideProps {
    isOpen: boolean;
    clipboardSuccess: boolean;
    onDismiss: () => void;
}

/**
 * iOS Safari에서 홈 화면 추가 4단계 안내 모달
 * 참조: LID 프로젝트 (frontend/src/components/modals/IOSInstallGuide.jsx)
 */
function IOSInstallGuide({
    isOpen,
    clipboardSuccess,
    onDismiss,
}: IOSInstallGuideProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopyURL = async () => {
        const success = await copyToClipboard(getCurrentURL());
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="pwa-modal-overlay" onClick={onDismiss}>
            <div
                className="pwa-modal-content ios-guide-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="pwa-modal-title">Safari에서 앱 설치하기</h2>

                {clipboardSuccess ? (
                    <div className="pwa-clipboard-status success">
                        <Check size={20} />
                        <span>주소가 복사되었어요</span>
                    </div>
                ) : (
                    <div className="pwa-clipboard-status fail">
                        <Copy size={20} />
                        <span>주소 복사가 필요해요</span>
                        <button className="pwa-copy-url-button" onClick={handleCopyURL}>
                            {copied ? '✓ 복사됨' : '📋 복사하기'}
                        </button>
                        <div className="pwa-current-url">{getCurrentURL()}</div>
                    </div>
                )}

                <div className="ios-steps">
                    <div className="ios-step">
                        <div className="step-header">
                            <Search size={24} className="step-icon-large" />
                            <span className="step-label">Step 1</span>
                        </div>
                        <div className="step-description">
                            상단 주소창 길게 터치
                            <br />
                            &quot;붙여넣고 이동&quot; 선택
                        </div>
                    </div>

                    <div className="ios-step">
                        <div className="step-header">
                            <Share2 size={24} className="step-icon-large" />
                            <span className="step-label">Step 2</span>
                        </div>
                        <div className="step-description">하단 공유 버튼 터치</div>
                    </div>

                    <div className="ios-step">
                        <div className="step-header">
                            <PlusSquare size={24} className="step-icon-large" />
                            <span className="step-label">Step 3</span>
                        </div>
                        <div className="step-description">&quot;홈 화면에 추가&quot; 선택</div>
                    </div>

                    <div className="ios-step">
                        <div className="step-header">
                            <Check size={24} className="step-icon-large" />
                            <span className="step-label">Step 4</span>
                        </div>
                        <div className="step-description">&quot;추가&quot; 버튼 터치</div>
                    </div>
                </div>

                <button className="pwa-secondary-button" onClick={onDismiss}>
                    나중에 할게요
                </button>
            </div>
        </div>
    );
}

export default IOSInstallGuide;
