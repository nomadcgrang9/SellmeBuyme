/**
 * 카카오톡 인앱 브라우저 전환 안내 모달
 * 카카오톡에서는 PWA 설치가 불가능하므로 외부 브라우저로 전환 안내
 */
import { useState } from 'react';
import { X, ExternalLink, Copy, Check } from 'lucide-react';
import { isIOS, isAndroid, openInChrome, copyToClipboard } from '@/lib/utils/pwaUtils';

interface KakaoTalkGuideProps {
  onClose: () => void;
  onDismiss: () => void;
}

export default function KakaoTalkGuide({ onClose, onDismiss }: KakaoTalkGuideProps) {
  const [copied, setCopied] = useState(false);
  const currentUrl = window.location.href;

  const handleOpenChrome = () => {
    if (isAndroid()) {
      openInChrome(currentUrl);
    }
  };

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(currentUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* 모달 */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">외부 브라우저에서 열기</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 안내 내용 */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            카카오톡에서는 앱 설치가 지원되지 않습니다.
            {isIOS() ? ' Safari' : ' Chrome'}에서 열어주세요.
          </p>

          {/* Android: Chrome으로 열기 버튼 */}
          {isAndroid() && (
            <button
              onClick={handleOpenChrome}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#a8c5e0] hover:bg-[#7aa3cc] text-gray-900 rounded-lg text-sm font-medium transition-colors mb-3"
            >
              <ExternalLink className="w-4 h-4" />
              Chrome에서 열기
            </button>
          )}

          {/* iOS: URL 복사 */}
          {isIOS() && (
            <>
              <button
                onClick={handleCopyUrl}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#a8c5e0] hover:bg-[#7aa3cc] text-gray-900 rounded-lg text-sm font-medium transition-colors mb-3"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    주소 복사
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center">
                복사 후 Safari에서 붙여넣기 해주세요
              </p>
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 pt-0 space-y-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
          <button
            onClick={() => {
              onDismiss();
              onClose();
            }}
            className="w-full py-2 text-gray-500 text-xs hover:text-gray-700 transition-colors"
          >
            다시 보지 않기
          </button>
        </div>
      </div>
    </div>
  );
}
