'use client';

import { IconSearch, IconUser, IconBriefcase, IconUsers, IconAdjustmentsHorizontal, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToggleType = 'job' | 'talent' | 'experience';
const toggleOrder: ToggleType[] = ['job', 'talent', 'experience'];

export default function Header() {
  const [activeToggle, setActiveToggle] = useState<ToggleType>('job');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFilter, setOpenFilter] = useState<'region' | 'category' | 'sort' | null>(null);
  const [filters, setFilters] = useState({
    region: '전지역',
    category: '전분야',
    sort: '추천순'
  });

  const handleToggle = () => {
    const currentIndex = toggleOrder.indexOf(activeToggle);
    const nextToggle = toggleOrder[(currentIndex + 1) % toggleOrder.length];
    setActiveToggle(nextToggle);
  };

  const toggleLabelMap: Record<ToggleType, string> = {
    job: '공고',
    talent: '인력',
    experience: '체험'
  };

  const activeColorMap: Record<ToggleType, string> = {
    job: 'bg-[#7aa3cc]',
    talent: 'bg-[#7db8a3]',
    experience: 'bg-[#f4c96b]'
  };

  const slidePositionMap: Record<ToggleType, number> = {
    job: 2,
    talent: 22,
    experience: 42
  };

  const handleFilterClick = (filterType: 'region' | 'category' | 'sort') => {
    setOpenFilter(openFilter === filterType ? null : filterType);
  };

  const handleFilterSelect = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setOpenFilter(null);
  };

  const regions = [
    '전지역', '수원', '성남', '용인', '안양',
    '부천', '안산', '남양주', '화성', '평택',
    '의정부', '시흥', '파주', '김포', '광명',
    '광주', '군포', '오산', '이천', '양주',
    '안성', '구리', '포천', '의왕', '하남',
    '여주', '동두천', '과천', '고양', '가평'
  ];

  const categories = [
    '전분야', '코딩', '영어',
    '수학', '과학', '예체능',
    '음악', '미술', '방과후',
    '돌봄', '특수교육', '상담',
    '행정', '기타'
  ];

  const sortOptions = [
    { value: '추천순', label: '추천순' },
    { value: '최신순', label: '최신순' },
    { value: '마감임박순', label: '마감임박순' },
    { value: '평점높은순', label: '평점높은순' },
    { value: '급여높은순', label: '급여높은순' },
    { value: '경력무관', label: '경력무관' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 font-esamanru">
      <div className="max-w-container mx-auto px-6 py-2.5">
        {/* 단일 행: 로고 + 토글 + 검색 + 필터 + 버튼 */}
        <div className="flex items-center gap-4">
          {/* 로고 + 토글 (좌측) */}
          <div className="flex items-center gap-3 shrink-0">
            <h1 className="text-xl font-extrabold text-gray-900" style={{ letterSpacing: '-0.5px' }}>셀미바이미</h1>
            
            {/* 스위치 토글 */}
            <button
              onClick={handleToggle}
              title={`${toggleLabelMap[toggleOrder[(toggleOrder.indexOf(activeToggle) + 1) % toggleOrder.length]]} 보기`}
              className="relative w-16 h-6 bg-gray-300 rounded-full transition-all duration-300 hover:bg-gray-400"
            >
              <motion.div
                className={`absolute top-0.5 w-5 h-5 rounded-full transition-colors duration-300 flex items-center justify-center ${
                  activeColorMap[activeToggle]
                }`}
                animate={{
                  x: slidePositionMap[activeToggle]
                }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30
                }}
              >
                <span className="text-[8px] font-semibold text-white leading-none pointer-events-none select-none">
                  {toggleLabelMap[activeToggle]}
                </span>
              </motion.div>
            </button>
          </div>

          {/* 검색찼 + 필터 통합 */}
          <div className="flex-1 max-w-[680px]">
            <div className="relative flex items-center h-9 border border-gray-300 rounded-md focus-within:border-primary transition-colors">
              <IconSearch 
                className="absolute left-3 text-gray-400" 
                size={16} 
                stroke={1.5}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="flex-1 h-full pl-10 pr-3 text-sm bg-transparent focus:outline-none"
              />
              
              {/* 필터 태그들 */}
              <div className="flex items-center gap-2 pr-3 border-l border-gray-200 pl-3">

                {/* 지역 필터 */}
                <div className="relative">
                  <button
                    onClick={() => handleFilterClick('region')}
                    className={`px-2.5 py-1 text-xs rounded transition-all ${
                      filters.region !== '전지역'
                        ? 'bg-gray-100 text-gray-900 font-medium border border-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    } ${
                      openFilter === 'region' ? 'bg-[#f0f6fa] border-primary' : ''
                    }`}
                  >
                    {filters.region}
                  </button>
              
              {/* 지역 드롭다운 */}
              <AnimatePresence>
                {openFilter === 'region' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-md shadow-xl border border-gray-200 p-3 z-50"
                    style={{ width: '380px' }}
                  >
                    <div className="grid grid-cols-5 gap-2">
                      {regions.map((region) => (
                        <button
                          key={region}
                          onClick={() => handleFilterSelect('region', region)}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            filters.region === region
                              ? 'bg-primary text-white border-primary font-medium'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

                {/* 분야 필터 */}
                <div className="relative">
                  <button
                    onClick={() => handleFilterClick('category')}
                    className={`px-2.5 py-1 text-xs rounded transition-all ${
                      filters.category !== '전분야'
                        ? 'bg-gray-100 text-gray-900 font-medium border border-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    } ${
                      openFilter === 'category' ? 'bg-[#f0f6fa] border-primary' : ''
                    }`}
                  >
                    {filters.category}
                  </button>
              
              {/* 분야 드롭다운 */}
              <AnimatePresence>
                {openFilter === 'category' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-md shadow-xl border border-gray-200 p-3 z-50"
                    style={{ width: '280px' }}
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => handleFilterSelect('category', category)}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            filters.category === category
                              ? 'bg-primary text-white border-primary font-medium'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

                {/* 정렬 필터 */}
                <div className="relative">
                  <button
                    onClick={() => handleFilterClick('sort')}
                    className={`px-2.5 py-1 text-xs rounded transition-all ${
                      filters.sort !== '추천순'
                        ? 'bg-gray-100 text-gray-900 font-medium border border-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    } ${
                      openFilter === 'sort' ? 'bg-[#f0f6fa] border-primary' : ''
                    }`}
                  >
                    {filters.sort}
                  </button>
              
              {/* 정렬 드롭다운 */}
              <AnimatePresence>
                {openFilter === 'sort' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-md shadow-xl border border-gray-200 p-3 z-50"
                    style={{ width: '230px' }}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleFilterSelect('sort', option.value)}
                          className={`px-3 py-2 text-xs rounded border transition-colors ${
                            filters.sort === option.value
                              ? 'bg-primary text-white border-primary font-medium'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* 우측 로그인 버튼 */}
          <div className="flex gap-2 shrink-0">
            <button className="btn-interactive flex items-center gap-1.5 h-9 px-4 text-sm font-medium border border-gray-300 rounded-md whitespace-nowrap hover:bg-gray-50">
              <IconUser size={16} stroke={1.5} />
              <span>로그인</span>
            </button>
          </div>
        </div>
      </div>

      {/* 오버레이 (필터 외부 클릭 감지) */}
      {openFilter && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenFilter(null)}
        />
      )}
    </header>
  );
}