import React from 'react';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 pt-12 pb-24 md:pb-12 mt-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8">
            <div>
                <div className="mb-4 grayscale opacity-70">
                   <Logo />
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                    <p>쌤찾기 고객센터 : 02-1234-5678 (평일 09:00 - 18:00)</p>
                    <p>이메일 : help@ssamfindz.com</p>
                    <p className="mt-4">(주)쌤찾기z | 대표: 홍길동 | 사업자등록번호: 123-45-67890</p>
                    <p>주소: 서울특별시 강남구 테헤란로 123</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm text-gray-600">
                <div className="flex flex-col gap-2">
                    <a href="#" className="font-bold text-gray-900">서비스 소개</a>
                    <a href="#" className="hover:text-blue-600">채용 공고</a>
                </div>
                <div className="flex flex-col gap-2">
                    <a href="#" className="font-bold text-gray-900">약관 및 정책</a>
                    <a href="#" className="hover:text-blue-600">이용약관</a>
                    <a href="#" className="hover:text-blue-600 font-bold">개인정보처리방침</a>
                </div>
                <div className="flex flex-col gap-2">
                    <a href="#" className="font-bold text-gray-900">지원</a>
                    <a href="#" className="hover:text-blue-600">고객센터</a>
                    <a href="#" className="hover:text-blue-600">제휴 문의</a>
                </div>
            </div>
        </div>
        
        <div className="border-t border-gray-200 pt-8 text-xs text-gray-400">
            Copyright (c) (주)쌤찾기z. All rights reserved.
        </div>
      </div>
    </footer>
  );
};