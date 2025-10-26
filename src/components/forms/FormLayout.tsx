'use client';

import { ReactNode } from 'react';

interface FormLayoutProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
  submitText?: string;
  isSubmitting?: boolean;
}

export default function FormLayout({
  title,
  onClose,
  onSubmit,
  children,
  submitText = '등록하기',
  isSubmitting = false
}: FormLayoutProps) {
  return (
    <div className="h-[280px] bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* 폼 내용만 표시 - X버튼과 하단 버튼 영역 완전 제거 */}
      <form onSubmit={onSubmit} className="h-full overflow-y-auto p-2">
        {children}
      </form>
    </div>
  );
}
