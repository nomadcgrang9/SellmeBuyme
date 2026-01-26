import { Download } from 'lucide-react';
import { showInstallPrompt, getDeferredPrompt } from '@/lib/utils/pwaUtils';
import './InstallButton.css';

interface InstallButtonProps {
    className?: string;
    onInstallSuccess?: () => void;
    onInstallDismiss?: () => void;
}

/**
 * 헤더에 표시되는 PWA 설치 버튼
 * beforeinstallprompt 이벤트가 발생한 경우에만 사용 가능
 */
function InstallButton({
    className = '',
    onInstallSuccess,
    onInstallDismiss,
}: InstallButtonProps) {
    const handleClick = async () => {
        const prompt = getDeferredPrompt();
        if (!prompt) return;

        const outcome = await showInstallPrompt();

        if (outcome === 'accepted') {
            console.log('사용자가 PWA 설치를 수락했습니다');
            onInstallSuccess?.();
        } else if (outcome === 'dismissed') {
            console.log('사용자가 PWA 설치를 거부했습니다');
            onInstallDismiss?.();
        }
    };

    return (
        <button
            className={`pwa-install-btn ${className}`}
            onClick={handleClick}
            aria-label="앱 설치하기"
        >
            <Download size={18} />
            <span className="pwa-install-text">앱 설치</span>
        </button>
    );
}

export default InstallButton;
