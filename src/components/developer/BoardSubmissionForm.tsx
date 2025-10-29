// BoardSubmissionForm - 게시판 등록 제출 폼
import { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import RegionSelector from './RegionSelector';
import SchoolLevelSelector from './SchoolLevelSelector';
import type { BoardSubmissionFormData } from '@/types/developer';
import type { SchoolLevel } from '@/types';

interface BoardSubmissionFormProps {
  onClose: () => void;
  onSubmit: (data: BoardSubmissionFormData) => Promise<void>;
}

export default function BoardSubmissionForm({
  onClose,
  onSubmit,
}: BoardSubmissionFormProps) {
  const [boardName, setBoardName] = useState('');
  const [boardUrl, setBoardUrl] = useState('');
  const [provinceCode, setProvinceCode] = useState<string | null>(null);
  const [cityCode, setCityCode] = useState<string | null>(null);
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!boardName.trim()) {
      setError('게시판 이름을 입력해주세요');
      return;
    }
    if (!boardUrl.trim()) {
      setError('게시판 URL을 입력해주세요');
      return;
    }
    if (!provinceCode) {
      setError('광역자치단체를 선택해주세요');
      return;
    }
    if (!schoolLevel) {
      setError('학교급을 선택해주세요');
      return;
    }

    // URL 형식 검사
    try {
      new URL(boardUrl);
    } catch {
      setError('올바른 URL 형식이 아닙니다');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        boardName: boardName.trim(),
        boardUrl: boardUrl.trim(),
        regionCode: provinceCode,
        subregionCode: cityCode,
        schoolLevel,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to submit board:', err);
      setError(
        err instanceof Error ? err.message : '게시판 제출에 실패했습니다'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* 폼 컨텐츠 */}
      <div className="relative w-full max-w-screen-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            게시판 등록 제안
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 게시판 이름 */}
          <div>
            <label
              htmlFor="boardName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              게시판 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="boardName"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="예: 경기도교육청 교육공무직"
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* 게시판 URL */}
          <div>
            <label
              htmlFor="boardUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              게시판 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="boardUrl"
              value={boardUrl}
              onChange={(e) => setBoardUrl(e.target.value)}
              placeholder="https://example.com/board"
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {boardUrl && (
              <a
                href={boardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#7aa3cc] hover:text-[#5a8ab0] mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                미리보기
              </a>
            )}
          </div>

          {/* 지역 선택 (필수) */}
          <RegionSelector
            provinceCode={provinceCode}
            cityCode={cityCode}
            onProvinceChange={setProvinceCode}
            onCityChange={setCityCode}
            disabled={isSubmitting}
            required
          />

          {/* 학교급 선택 (필수) */}
          <SchoolLevelSelector
            value={schoolLevel}
            onChange={setSchoolLevel}
            disabled={isSubmitting}
            required
          />

          {/* 설명 (선택) */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              설명 (선택)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 게시판에 대한 추가 정보를 입력해주세요"
              rows={3}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#a8c5e0] hover:bg-[#7aa3cc] rounded-lg text-sm font-medium text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
