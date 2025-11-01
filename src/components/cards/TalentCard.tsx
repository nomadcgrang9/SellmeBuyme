import { TalentCard as TalentCardType } from '@/types';
import { IconMapPin, IconBriefcase, IconStar, IconShieldCheck, IconPhone, IconAt } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/authStore';

interface TalentCardProps {
  talent: TalentCardType;
  onEditClick?: (card: TalentCardType) => void;
}

export default function TalentCard({ talent, onEditClick }: TalentCardProps) {
  const { user } = useAuthStore((s) => ({ user: s.user }));
  const isOwner = Boolean(user && talent.user_id && user.id === talent.user_id);
  return (
    <article className="card-interactive bg-white border border-gray-200 rounded-lg shadow-md animate-slide-up overflow-hidden flex flex-col h-full" style={{ minHeight: '240px', maxHeight: '240px' }}>
      {/* 상단 컬러 바 (인력=그린) */}
      <div className="h-1 bg-gradient-to-r from-[#7db8a3] to-[#6fb59b] flex-shrink-0" />

      <div className="flex flex-1 flex-col p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#2f855a]">인력</span>
          {talent.isVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#c5e3d8] text-[#0F172A] text-xs font-bold rounded-full">
              <IconShieldCheck size={14} stroke={1.5} /> 인증
            </span>
          )}
        </div>

        {/* 이름 */}
        <h3 className="text-lg font-extrabold text-gray-900 mb-1 line-clamp-1 break-keep overflow-hidden">
          {talent.name}
        </h3>

        {/* 전문 분야 */}
        <p className="text-base font-semibold text-gray-700 leading-snug mb-2 line-clamp-1 break-keep overflow-hidden">
          {talent.specialty}
        </p>

        {/* 태그 (최대 2개) */}
        <div className="mb-4 flex flex-wrap gap-2">
          {talent.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 정보 */}
        <div className="mt-auto space-y-1.5 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <IconMapPin size={16} stroke={1.5} className="text-[#2f855a] flex-shrink-0" />
            <span className="font-medium truncate">{talent.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconBriefcase size={16} stroke={1.5} className="text-[#3b8c6e] flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{talent.experience}</span>
          </div>
          {talent.phone && (
            <div className="flex items-center gap-2">
              <IconPhone size={16} stroke={1.5} className="text-emerald-600 flex-shrink-0" />
              <span className="font-medium truncate">{talent.phone}</span>
            </div>
          )}
          {talent.email && (
            <div className="flex items-center gap-2">
              <IconAt size={16} stroke={1.5} className="text-emerald-600 flex-shrink-0" />
              <span className="font-medium truncate">{talent.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <IconStar size={16} stroke={1.5} className="text-yellow-500 flex-shrink-0" />
            <span className="font-medium text-gray-900">
              {talent.rating.toFixed(1)}
            </span>
            <span className="font-medium text-gray-500">({talent.reviewCount})</span>
          </div>
          {isOwner && onEditClick && (
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditClick(talent); }}
                className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 hover:bg-emerald-100 transition-colors text-sm font-semibold"
              >
                수정하기
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
