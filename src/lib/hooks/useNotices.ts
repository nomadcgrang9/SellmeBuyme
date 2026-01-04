// useNotices - 공지사항 관리 훅
import { useState, useEffect, useCallback } from 'react';
import {
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  toggleNoticePinned,
  uploadNoticeFile,
} from '@/lib/supabase/developer';
import type { DevNotice, NoticeFormData, NoticeCategory } from '@/types/developer';

export function useNotices() {
  const [notices, setNotices] = useState<DevNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NoticeCategory | 'all'>('all');
  const [page, setPage] = useState(0); // 페이지네이션용
  const REGULAR_PAGE_SIZE = 3; // 일반 공지 페이지당 개수

  // 공지사항 목록 조회
  const fetchNotices = useCallback(async () => {
    console.log('[Notice] 📥 공지사항 목록 조회 시작...');
    setLoading(true);
    setError(null);
    setPage(0); // ✅ 새로고침 시 페이지 초기화
    try {
      const data = await getNotices(50);
      console.log('[Notice] ✅ DB에서 불러온 공지 개수:', data.length);
      if (data.length > 0) {
        console.log('[Notice] 최신 공지:', data[0].title, '(생성일:', data[0].createdAt, ')');
      }
      setNotices(data);
    } catch (err) {
      console.error('[Notice] ❌ 공지 목록 조회 실패:', err);
      setError('공지사항을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // 필터링된 전체 공지 목록
  const allFilteredNotices = filter === 'all'
    ? notices
    : notices.filter(n => n.category === filter);

  // 고정 공지와 일반 공지 분리
  const pinnedNotices = allFilteredNotices.filter(n => n.isPinned).slice(0, 2); // 최대 2개
  const regularNotices = allFilteredNotices.filter(n => !n.isPinned);

  // 페이지네이션 적용된 일반 공지
  const displayedRegularNotices = regularNotices.slice(0, (page + 1) * REGULAR_PAGE_SIZE);
  const hasMoreRegular = regularNotices.length > displayedRegularNotices.length;

  // 최종 표시 목록 (고정 + 일반)
  const filteredNotices = [...pinnedNotices, ...displayedRegularNotices];

  // 디버깅 로그 (useEffect로 이동하여 정확한 값 추적)
  useEffect(() => {
    console.log('[Notice] 📊 페이지네이션 상태:', {
      page,
      totalNotices: notices.length,
      totalFiltered: allFilteredNotices.length,
      pinnedCount: pinnedNotices.length,
      pinnedTitles: pinnedNotices.map(n => n.title),
      totalRegular: regularNotices.length,
      regularTitles: regularNotices.map(n => n.title),
      displayed: displayedRegularNotices.length,
      displayedTitles: displayedRegularNotices.map(n => n.title),
      hasMore: hasMoreRegular,
      finalCount: filteredNotices.length,
      REGULAR_PAGE_SIZE,
      expectedDisplayed: (page + 1) * REGULAR_PAGE_SIZE
    });
  }, [page, notices.length, allFilteredNotices.length, regularNotices.length, displayedRegularNotices.length, hasMoreRegular, pinnedNotices.length, filteredNotices.length]);

  // 공지사항 생성 (파일 업로드 포함)
  const createNewNotice = useCallback(async (data: NoticeFormData) => {
    try {
      // 임시 ID 생성 (파일 업로드용)
      const tempId = crypto.randomUUID();

      // 첨부파일 업로드
      const attachmentUrls: string[] = [];
      if (data.attachments && data.attachments.length > 0) {
        console.log('[Notice] Uploading', data.attachments.length, 'files...');
        for (const file of data.attachments) {
          try {
            console.log('[Notice] Uploading:', file.name, file.size, 'bytes');
            const url = await uploadNoticeFile(file, tempId);
            console.log('[Notice] Upload success:', url);
            attachmentUrls.push(url);
          } catch (err) {
            console.error('[Notice] Upload failed:', file.name, err);
            alert(`파일 업로드 실패: ${file.name}\n${err instanceof Error ? err.message : '알 수 없는 오류'}`);
          }
        }
        console.log('[Notice] Total uploaded:', attachmentUrls.length);
      }

      // 공지사항 생성 (URL 배열 전달)
      console.log('[Notice] Creating notice with data:', {
        authorName: data.authorName,
        title: data.title,
        category: data.category,
        isPinned: data.isPinned,
        attachmentsCount: attachmentUrls.length,
      });

      const newNotice = await createNotice({
        authorName: data.authorName,
        title: data.title,
        content: data.content,
        category: data.category,
        isPinned: data.isPinned,
        attachments: attachmentUrls,
      });

      console.log('[Notice] ✅ DB 저장 성공:', newNotice.id, newNotice.title);

      setNotices(prev => {
        const updated = [newNotice, ...prev];
        console.log('[Notice] 로컬 상태 업데이트 완료, 총 공지 개수:', updated.length);
        return updated;
      });

      return newNotice;
    } catch (err) {
      console.error('[Notice] ❌ 공지 생성 실패:', err);
      if (err instanceof Error) {
        console.error('[Notice] 에러 상세:', err.message, err.stack);
      }
      throw err;
    }
  }, []);

  // 공지사항 수정 (새 파일 업로드 포함)
  const updateNoticeItem = useCallback(async (
    id: string,
    data: Partial<NoticeFormData>,
    existingAttachments: string[] = []
  ) => {
    try {
      // 새 첨부파일 업로드
      const newAttachmentUrls: string[] = [];
      if (data.attachments && data.attachments.length > 0) {
        for (const file of data.attachments) {
          try {
            const url = await uploadNoticeFile(file, id);
            newAttachmentUrls.push(url);
          } catch (err) {
            console.error('Failed to upload file:', file.name, err);
          }
        }
      }

      // 기존 + 새 첨부파일 합치기
      const allAttachments = [...existingAttachments, ...newAttachmentUrls];

      const updatedNotice = await updateNotice(id, {
        ...data,
        attachments: allAttachments.length > 0 ? allAttachments : undefined,
      });
      setNotices(prev => prev.map(n => n.id === id ? updatedNotice : n));
      return updatedNotice;
    } catch (err) {
      console.error('Failed to update notice:', err);
      throw err;
    }
  }, []);

  // 공지사항 삭제
  const deleteNoticeItem = useCallback(async (id: string) => {
    try {
      await deleteNotice(id);
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notice:', err);
      throw err;
    }
  }, []);

  // 고정 토글
  const togglePinned = useCallback(async (id: string) => {
    const notice = notices.find(n => n.id === id);
    if (!notice) return;

    // 고정 공지가 이미 2개이고, 새로 고정하려는 경우 경고
    const currentPinnedCount = notices.filter(n => n.isPinned).length;
    if (!notice.isPinned && currentPinnedCount >= 2) {
      alert('고정 공지는 최대 2개까지만 가능합니다.\n다른 고정 공지를 해제한 후 시도해주세요.');
      return;
    }

    try {
      const updatedNotice = await toggleNoticePinned(id, !notice.isPinned);
      setNotices(prev => {
        const updated = prev.map(n => n.id === id ? updatedNotice : n);
        // 고정 공지를 상단으로 정렬
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
    } catch (err) {
      console.error('Failed to toggle notice pin:', err);
      throw err;
    }
  }, [notices]);

  // 더 보기 함수
  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setPage(0);
  }, [filter]);

  return {
    notices: filteredNotices,
    allNotices: notices,
    loading,
    error,
    filter,
    setFilter,
    hasMore: hasMoreRegular,
    loadMore,
    createNewNotice,
    updateNoticeItem,
    deleteNoticeItem,
    togglePinned,
    refresh: fetchNotices,
  };
}
