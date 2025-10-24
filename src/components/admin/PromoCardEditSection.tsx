import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import PromoCardContent from './PromoCardContent';

export default function PromoCardEditSection() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300">
      {/* 토글 헤더 */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <IconChevronDown
            size={20}
            className={`text-slate-400 transition-transform duration-200 ${
              isExpanded ? '' : '-rotate-90'
            }`}
          />
          <div>
            <h3 className="text-base font-semibold text-slate-900">프로모 카드 편집</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              헤드라인과 이미지 중심으로 간단한 홍보 카드를 구성합니다.
            </p>
          </div>
        </div>

        {/* 상태 배지 */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            활성
          </span>
        </div>
      </button>

      {/* 펼쳐진 콘텐츠 */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {isExpanded && (
          <div className="border-t border-slate-200 p-6">
            <PromoCardContent />
          </div>
        )}
      </div>
    </div>
  );
}