import { ExperienceCard as ExperienceCardType } from '@/types';
import { IconMapPin, IconCategory, IconSchool, IconUsers, IconPhone, IconAt } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/authStore';

interface ExperienceCardProps {
  card: ExperienceCardType;
  onEditClick?: (card: ExperienceCardType) => void;
}

export default function ExperienceCard({ card, onEditClick }: ExperienceCardProps) {
  const { user } = useAuthStore((state) => ({ user: state.user }));
  const isOwner = Boolean(user && card.user_id && user.id === card.user_id);

  const categories = card.categories.slice(0, 3);
  const targetLevels = card.targetSchoolLevels.slice(0, 3);
  const operationTypes = card.operationTypes.slice(0, 3);

  return (
    <article className="card-interactive bg-white border border-gray-200 rounded-lg shadow-md animate-slide-up overflow-hidden flex flex-col h-full" style={{ minHeight: '240px', maxHeight: '240px' }}>
      <div className="h-0.5 bg-gradient-to-r from-[#FBBF24] to-[#F97316]" />

      <div className="flex h-full flex-col p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#F97316]">체험</span>
          <span className="text-xs text-gray-500">{new Date(card.createdAt).toLocaleDateString()}</span>
        </div>

        <h3 className="text-lg font-extrabold text-gray-900 mb-1 line-clamp-1 break-keep overflow-hidden">
          {card.programTitle}
        </h3>

        <p className="text-sm text-gray-600 leading-snug mb-2 line-clamp-2 break-keep overflow-hidden">
          {card.introduction}
        </p>

        {categories.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5 text-xs text-gray-700">
            <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 font-semibold text-orange-600">
              <IconCategory size={14} stroke={1.5} />
              <span>{categories.join(', ')}</span>
            </div>
          </div>
        )}

        <div className="space-y-1.5 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <IconMapPin size={16} stroke={1.5} className="text-[#F97316] flex-shrink-0" />
            <span className="font-medium truncate">{card.locationSummary}</span>
          </div>

          {targetLevels.length > 0 && (
            <div className="flex items-center gap-2">
              <IconSchool size={16} stroke={1.5} className="text-[#F97316] flex-shrink-0" />
              <span className="font-medium truncate">{targetLevels.join(', ')}</span>
            </div>
          )}

          {operationTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <IconUsers size={16} stroke={1.5} className="text-[#EA580C] flex-shrink-0" />
              <span className="font-medium truncate">{operationTypes.join(', ')}</span>
            </div>
          )}

          {card.capacity && (
            <div className="flex items-center gap-2">
              <IconUsers size={16} stroke={1.5} className="text-[#EA580C] flex-shrink-0" />
              <span className="font-medium truncate">수용 인원: {card.capacity}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <IconPhone size={16} stroke={1.5} className="text-[#F97316] flex-shrink-0" />
            <span className="font-medium truncate">{card.contactPhone}</span>
          </div>

          <div className="flex items-center gap-2">
            <IconAt size={16} stroke={1.5} className="text-[#F97316] flex-shrink-0" />
            <span className="font-medium truncate">{card.contactEmail}</span>
          </div>
        </div>

        {isOwner && onEditClick && (
          <div className="pt-3 mt-auto">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEditClick(card);
              }}
              className="w-full inline-flex items-center justify-center rounded-lg bg-orange-50 text-orange-600 px-3 py-2 hover:bg-orange-100 transition-colors text-sm font-semibold"
            >
              수정하기
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
