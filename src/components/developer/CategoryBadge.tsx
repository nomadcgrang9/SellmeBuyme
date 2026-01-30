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
          colorClass: 'border border-blue-500 text-blue-600',
        };
      case 'bug':
        return {
          label: '버그',
          icon: Bug,
          colorClass: 'border border-red-500 text-red-600',
        };
      case 'design':
        return {
          label: '디자인',
          icon: Palette,
          colorClass: 'border border-purple-500 text-purple-600',
        };
      case 'other':
        return {
          label: '기타',
          icon: MoreHorizontal,
          colorClass: 'border border-gray-400 text-gray-600',
        };
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.colorClass}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
