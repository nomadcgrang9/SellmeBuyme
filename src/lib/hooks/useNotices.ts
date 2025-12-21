// useNotices - 공지사항 관리 훅
import { useState, useEffect, useCallback } from 'react';
import {
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  toggleNoticePinned,
} from '@/lib/supabase/developer';
import type { DevNotice, NoticeFormData, NoticeCategory } from '@/types/developer';

export function useNotices() {
  const [notices, setNotices] = useState<DevNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NoticeCategory | 'all'>('all');

  // 공지사항 목록 조회
  const fetchNotices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotices(50);
      setNotices(data);
    } catch (err) {
      console.error('Failed to fetch notices:', err);
      setError('공지사항을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // 필터링된 공지 목록
  const filteredNotices = filter === 'all'
    ? notices
    : notices.filter(n => n.category === filter);

  // 공지사항 생성
  const createNewNotice = useCallback(async (data: NoticeFormData) => {
    try {
      const newNotice = await createNotice(data);
      setNotices(prev => [newNotice, ...prev]);
      return newNotice;
    } catch (err) {
      console.error('Failed to create notice:', err);
      throw err;
    }
  }, []);

  // 공지사항 수정
  const updateNoticeItem = useCallback(async (id: string, data: Partial<NoticeFormData>) => {
    try {
      const updatedNotice = await updateNotice(id, data);
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

  return {
    notices: filteredNotices,
    allNotices: notices,
    loading,
    error,
    filter,
    setFilter,
    createNewNotice,
    updateNoticeItem,
    deleteNoticeItem,
    togglePinned,
    refresh: fetchNotices,
  };
}
