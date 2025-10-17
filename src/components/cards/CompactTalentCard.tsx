import { TalentCard as TalentCardType } from '@/types';
import { IconMapPin, IconBriefcase, IconStar } from '@tabler/icons-react';

interface CompactTalentCardProps {
  talent: TalentCardType;
}

export default function CompactTalentCard({ talent }: CompactTalentCardProps) {
  return (
    <article className="card-interactive bg-white border border-gray-200 rounded-lg animate-slide-up overflow-hidden h-full">
      {/* 상단 컬러 바 */}
      <div className="h-0.5 bg-gradient-to-r from-[#9fd5bf] to-[#6fb59b]" />
      
      <div className="flex h-full flex-col p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#7db8a3]">인력풀</span>
          {talent.isVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7db8a3] text-white text-xs font-bold rounded-full">
              ✓ 인증
            </span>
          )}
        </div>

        {/* 이름 */}
        <h3 className="text-lg font-extrabold text-gray-900 mb-1 line-clamp-1" style={{ letterSpacing: '-0.4px' }}>
          {talent.name}
        </h3>

        {/* 전문 분야 */}
        <p className="text-base font-semibold text-gray-700 leading-snug mb-2 line-clamp-1">
          {talent.specialty}
        </p>

        {/* 태그 (최대 2개) */}
        <div className="mb-4 flex flex-wrap gap-2">
          {talent.tags.slice(0, 3).map((tag, index) => {
            const tagColors = [
              'bg-[#e5f4f0] text-[#5a9d85]',
              'bg-[#dff0ea] text-[#5a9d85]',
              'bg-cyan-100 text-cyan-700'
            ];
            return (
              <span
                key={index}
                className={`rounded-full px-2.5 py-1 text-sm font-semibold ${tagColors[index % tagColors.length]}`}
              >
                {tag}
              </span>
            );
          })}
        </div>

        {/* 정보 */}
        <div className="mt-auto space-y-1.5 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <IconMapPin size={16} stroke={1.5} className="text-[#7aa3cc] flex-shrink-0" />
            <span className="font-medium truncate">{talent.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconBriefcase size={16} stroke={1.5} className="text-purple-500 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{talent.experience}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconStar size={16} stroke={1.5} className="text-yellow-500 flex-shrink-0" />
            <span className="font-medium text-gray-900">
              {talent.rating.toFixed(1)}
            </span>
            <span className="font-medium text-gray-500">({talent.reviewCount})</span>
          </div>
        </div>
      </div>
    </article>
  );
}
