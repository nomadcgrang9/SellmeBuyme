import { Home, Briefcase, Users, Sparkles, Plus, MessagesSquare, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchStore } from '@/stores/searchStore';
import { useWagleStore } from '@/stores/wagleStore';

interface MobileBottomNavProps {
  currentTab: 'home' | 'wagle' | 'profile' | null;
  onTabChange: (tab: 'home' | 'wagle' | 'profile' | null) => void;
  onChatClick: () => void;
  onProfileClick: () => void;
  onRegisterClick: () => void;
  onHomeClick: () => void;
}

/** 뷰 타입별 설정 */
const VIEW_TYPE_CONFIG = {
  job: {
    icon: Briefcase,
    label: '공고',
    color: '#7aa3cc',
    bgColor: 'rgba(122, 163, 204, 0.1)',
  },
  talent: {
    icon: Users,
    label: '인재',
    color: '#7db8a3',
    bgColor: 'rgba(125, 184, 163, 0.1)',
  },
  experience: {
    icon: Sparkles,
    label: '체험',
    color: '#f4c96b',
    bgColor: 'rgba(244, 201, 107, 0.1)',
  },
};

export default function MobileBottomNav({
  currentTab,
  onTabChange,
  onChatClick,
  onProfileClick,
  onRegisterClick,
  onHomeClick
}: MobileBottomNavProps) {
  const { viewType, setViewType } = useSearchStore();
  const { unreadCount } = useWagleStore();

  // 토글 버튼 클릭 핸들러
  const handleToggleView = () => {
    const viewOrder: Array<'job' | 'talent' | 'experience'> = ['job', 'talent', 'experience'];
    const currentIndex = viewOrder.indexOf(viewType as 'job' | 'talent' | 'experience');
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % viewOrder.length;
    setViewType(viewOrder[nextIndex]);
  };

  // 현재 뷰 타입 설정
  const currentViewConfig = VIEW_TYPE_CONFIG[viewType as keyof typeof VIEW_TYPE_CONFIG] || VIEW_TYPE_CONFIG.job;
  const ViewIcon = currentViewConfig.icon;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.15)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {/* 1. 홈 버튼 */}
        <NavButton
          icon={Home}
          label="홈"
          isActive={currentTab === 'home'}
          onClick={() => {
            onTabChange('home');
            onHomeClick();
          }}
        />

        {/* 2. 토글 버튼 (공고/인력/체험) - 아이콘+레이블 표시 */}
        <motion.button
          onClick={handleToggleView}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[52px] transition-colors"
          aria-label={`현재: ${currentViewConfig.label}, 탭하여 전환`}
        >
          <motion.div
            key={viewType}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="p-1.5 rounded-lg"
            style={{ backgroundColor: currentViewConfig.bgColor }}
          >
            <ViewIcon
              size={22}
              strokeWidth={1.5}
              style={{ color: currentViewConfig.color }}
            />
          </motion.div>
          <motion.span
            key={`label-${viewType}`}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-medium"
            style={{ color: currentViewConfig.color }}
          >
            {currentViewConfig.label}
          </motion.span>
        </motion.button>

        {/* 3. 등록 버튼 */}
        <motion.button
          onClick={onRegisterClick}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[52px]"
          aria-label="등록"
        >
          <div className="p-1.5 rounded-full bg-blue-500 text-white">
            <Plus size={20} strokeWidth={2} />
          </div>
          <span className="text-[10px] font-medium text-gray-500">등록</span>
        </motion.button>

        {/* 4. 와글와글 버튼 */}
        <NavButton
          icon={MessagesSquare}
          label="와글와글"
          isActive={currentTab === 'wagle'}
          badge={unreadCount}
          onClick={() => {
            onTabChange('wagle');
            onChatClick();
          }}
        />

        {/* 5. 프로필 버튼 */}
        <NavButton
          icon={User}
          label="MY"
          isActive={currentTab === 'profile'}
          onClick={() => {
            onTabChange('profile');
            onProfileClick();
          }}
        />
      </div>
    </nav>
  );
}

/** 네비게이션 버튼 컴포넌트 */
function NavButton({
  icon: Icon,
  label,
  isActive,
  onClick,
  badge,
}: {
  icon: React.ComponentType<{ size?: string | number; strokeWidth?: string | number; className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="relative flex flex-col items-center justify-center gap-0.5 min-w-[52px] transition-colors"
      aria-label={label}
    >
      <div className="relative">
        <Icon
          size={24}
          strokeWidth={isActive ? 2 : 1.5}
          className={isActive ? 'text-gray-900' : 'text-gray-500'}
        />
        {badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span
        className={`text-[10px] font-medium ${
          isActive ? 'text-gray-900 font-semibold' : 'text-gray-500'
        }`}
      >
        {label}
      </span>
      {isActive && (
        <motion.div
          layoutId="navIndicator"
          className="absolute -bottom-0.5 w-5 h-[2px] rounded-full bg-gray-900"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
}
