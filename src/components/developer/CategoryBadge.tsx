// CategoryBadge - 아이디어 카테고리 배지 컴포넌트
import { Lightbulb, Bug, Palette, MoreHorizontal } from 'lucide-react';
import type { IdeaCategory } from '@/types/developer';

interface CategoryBadgeProps {
  category: IdeaCategory;
  showIcon?: boolean;
}

export default function CategoryBadge({
  category,
  showIcon = true,
}: CategoryBadgeProps) {
  const getCategoryConfig = () => {
    switch (category) {
      case 'feature':
        return {
          label: '새 기능',
          icon: Lightbulb,
          colorClass: 'bg-blue-100 text-blue-800',
        };
      case 'bug':
        return {
          label: '버그',
          icon: Bug,
          colorClass: 'bg-red-100 text-red-800',
        };
      case 'design':
        return {
          label: '디자인',
          icon: Palette,
          colorClass: 'bg-purple-100 text-purple-800',
        };
      case 'other':
        return {
          label: '기타',
          icon: MoreHorizontal,
          colorClass: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.colorClass}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
