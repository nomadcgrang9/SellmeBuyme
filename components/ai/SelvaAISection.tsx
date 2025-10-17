'use client';

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import CompactJobCard from "../cards/CompactJobCard";
import CompactTalentCard from "../cards/CompactTalentCard";
import { aiRecommendations } from "@/lib/dummyData";

export default function SelvaAISection() {
  // Dummy data for carousel
  const cards = aiRecommendations.slice(0, 3); // Show 3 cards

  return (
    <section className="bg-gray-50 py-8">
      <div className="max-w-container mx-auto px-6">
        <h2 className="text-2xl font-bold mb-4">⚡ 셀바 AI</h2>
        <div className="flex gap-6">
          {/* Left Tab Menu */}
          <div className="w-[280px] shrink-0 rounded-xl shadow-lg p-5 flex flex-col justify-between bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <div>
              <h3 className="font-bold text-lg">셀바 검색결과</h3>
              <p className="text-sm opacity-80 mt-1">&quot;수원 코딩강사&quot; 검색 결과</p>
            </div>
            <div className="mt-4">
              <p className="font-semibold text-3xl">💬 23건</p>
              <p className="text-sm opacity-80">검색됨</p>
              <button className="text-xs mt-2 underline opacity-80 hover:opacity-100">
                필터 조정으로 더 정확한 결과 찾기
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-white text-indigo-600 font-bold py-2.5 rounded-lg text-sm shadow-md hover:bg-gray-100 transition-all">
                공고 등록
              </button>
              <button className="flex-1 bg-white text-indigo-600 font-bold py-2.5 rounded-lg text-sm shadow-md hover:bg-gray-100 transition-all">
                인력 등록
              </button>
            </div>
          </div>

          {/* Right Carousel */}
          <div className="flex-1 flex items-center gap-4">
            <button className="shrink-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100">
              <IconChevronLeft size={20} />
            </button>
            <div className="flex-1 grid grid-cols-3 gap-4">
              {cards.map((card, index) => (
                <div key={index}>
                  {card.type === 'job' ? (
                    <CompactJobCard {...card} />
                  ) : (
                    <CompactTalentCard {...card} />
                  )}
                </div>
              ))}
            </div>
            <button className="shrink-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100">
              <IconChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
