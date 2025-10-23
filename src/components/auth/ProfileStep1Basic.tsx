'use client';

import { useEffect, useState } from 'react';
import { IconUpload, IconX } from '@tabler/icons-react';

interface ProfileStep1BasicProps {
  displayName: string;
  email: string | null;
  phone: string;
  profileImage: File | null;
  initialImageUrl?: string | null;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onImageChange: (file: File | null) => void;
  isEditMode: boolean;
}

export default function ProfileStep1Basic({
  displayName,
  email,
  phone,
  profileImage,
  initialImageUrl,
  onNameChange,
  onPhoneChange,
  onImageChange,
  isEditMode
}: ProfileStep1BasicProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!profileImage) {
      setImagePreview(initialImageUrl || null);
    }
  }, [initialImageUrl, profileImage]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택 가능합니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    onImageChange(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    onImageChange(null);
    setImagePreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-[#f8fbff] px-5 py-5">
        <label className="space-y-2">
          <span className="text-xs font-semibold text-[#7aa3cc]">이름 *</span>
          <input
            type="text"
            value={displayName}
            onChange={(event) => onNameChange(event.target.value)}
            disabled={isEditMode}
            readOnly={isEditMode}
            placeholder="홍길동"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3] disabled:bg-gray-50"
          />
        </label>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
        <div className="grid gap-2 text-sm text-gray-600">
          <span className="text-xs font-semibold text-[#7aa3cc]">이메일</span>
          <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700">
            <span>{email ?? '이메일 정보 없음'}</span>
            <span className="text-xs text-gray-400">소셜 계정 연동</span>
          </div>
        </div>

        <label className="space-y-2">
          <span className="text-xs font-semibold text-[#7aa3cc]">전화번호</span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            placeholder="010-1234-5678"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3]"
          />
        </label>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
        <span className="text-xs font-semibold text-[#7aa3cc]">프로필 사진 (선택사항)</span>

        {imagePreview ? (
          <div className="relative w-full max-w-xs">
            <img
              src={imagePreview}
              alt="프로필 미리보기"
              className="w-full h-40 rounded-xl object-cover border border-gray-200"
            />
            <button
              type="button"
              onClick={handleImageRemove}
              className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
              aria-label="이미지 제거"
            >
              <IconX size={16} className="text-gray-600" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 cursor-pointer hover:border-[#7aa3cc] hover:bg-[#f8fbff] transition-colors">
            <IconUpload size={24} className="text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">이미지를 선택해 주세요</p>
              <p className="text-xs text-gray-500">JPG, PNG (최대 5MB)</p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              aria-label="프로필 사진 업로드"
            />
          </label>
        )}
      </div>
    </div>
  );
}
