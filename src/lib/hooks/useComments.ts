import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CommentTargetType, DevComment } from '@/types/developer';
import {
  getComments,
  createComment as createCommentAPI,
  updateComment as updateCommentAPI,
  deleteComment as deleteCommentAPI,
  getAuthorInfo,
} from '@/lib/supabase/developer';

const COMMENTS_STORAGE_KEY = 'dev_note_comments';
const AUTHOR_STORAGE_KEY = 'dev_note_comment_author';

type StoredComment = Omit<DevComment, 'replies'>;

type CommentMap = Record<string, StoredComment[]>;

type UseCommentsResult = {
  comments: DevComment[];
  loading: boolean;
  authorName: string;
  setAuthorName: (name: string) => void;
  addComment: (content: string, name: string, parentId?: string) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  reload: () => void;
};

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('LocalStorage is not available:', error);
    return null;
  }
}

function readComments(targetKey: string): StoredComment[] {
  const storage = getLocalStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as CommentMap;
    return parsed[targetKey] ?? [];
  } catch (error) {
    console.error('Failed to parse stored comments:', error);
    return [];
  }
}

function writeComments(targetKey: string, comments: StoredComment[]) {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    const raw = storage.getItem(COMMENTS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CommentMap) : {};
    parsed[targetKey] = comments;
    storage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('Failed to persist comments:', error);
  }
}

function readAuthorName(): string {
  const storage = getLocalStorage();
  if (!storage) return '';

  try {
    return storage.getItem(AUTHOR_STORAGE_KEY) ?? '';
  } catch (error) {
    console.error('Failed to read author name:', error);
    return '';
  }
}

function writeAuthorName(name: string) {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.setItem(AUTHOR_STORAGE_KEY, name);
  } catch (error) {
    console.error('Failed to save author name:', error);
  }
}

function toTree(comments: StoredComment[]): DevComment[] {
  const nodes = new Map<string, DevComment>();
  const roots: DevComment[] = [];

  const sorted = [...comments].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  sorted.forEach((comment) => {
    nodes.set(comment.id, { ...comment, replies: [] });
  });

  sorted.forEach((comment) => {
    const node = nodes.get(comment.id);
    if (!node) return;

    if (comment.parentId) {
      const parent = nodes.get(comment.parentId);
      if (parent) {
        parent.replies = [...(parent.replies ?? []), node];
        return;
      }
    }

    roots.push(node);
  });

  return roots;
}

function collectDescendants(comments: StoredComment[], commentId: string): Set<string> {
  const toRemove = new Set<string>([commentId]);
  let changed = true;

  while (changed) {
    changed = false;
    comments.forEach((comment) => {
      if (comment.parentId && toRemove.has(comment.parentId) && !toRemove.has(comment.id)) {
        toRemove.add(comment.id);
        changed = true;
      }
    });
  }

  return toRemove;
}

export function useComments(targetType: CommentTargetType, targetId: string): UseCommentsResult {
  const targetKey = `${targetType}:${targetId}`;
  const [flatComments, setFlatComments] = useState<StoredComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorNameState] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getComments(targetType, targetId);
      // 데이터를 StoredComment 형식으로 변환
      const comments: StoredComment[] = data.map((item: any) => ({
        id: item.id,
        parentId: item.parent_id || null,
        targetType: item.target_type,
        targetId: item.target_id,
        authorName: item.author_name,
        content: item.content,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
      setFlatComments(comments);
    } catch (error: any) {
      console.warn('Supabase comments unavailable, using localStorage:', error?.message);
      // 로컬 스토리지에서 폴백
      const comments = readComments(targetKey);
      setFlatComments(comments);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, targetKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const initAuthorName = async () => {
      try {
        const name = await getAuthorInfo();
        if (name) {
          setAuthorNameState(name);
        } else {
          const storedName = readAuthorName();
          if (storedName) {
            setAuthorNameState(storedName);
          }
        }
      } catch (error) {
        console.error('Failed to load author info:', error);
        const storedName = readAuthorName();
        if (storedName) {
          setAuthorNameState(storedName);
        }
      }
    };
    initAuthorName();
  }, []);

  const comments = useMemo(() => toTree(flatComments), [flatComments]);

  const setAuthorName = useCallback((name: string) => {
    setAuthorNameState(name);
    writeAuthorName(name);
  }, []);

  const addComment = useCallback(
    async (content: string, name: string, parentId?: string) => {
      const trimmedContent = content.trim();
      const trimmedName = name.trim();

      if (!trimmedContent || !trimmedName) {
        return;
      }

      // ✨ Optimistic Update: 즉시 로컬 상태에 추가 (임시 ID)
      const now = new Date().toISOString();
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticComment: StoredComment = {
        id: tempId,
        parentId: parentId ?? null,
        targetType,
        targetId,
        authorName: trimmedName,
        content: trimmedContent,
        createdAt: now,
        updatedAt: now,
      };

      setAuthorName(trimmedName);
      setFlatComments((prev) => [...prev, optimisticComment]);

      try {
        // 백그라운드에서 Supabase에 저장
        const saved = await createCommentAPI(targetType, targetId, trimmedContent, trimmedName, parentId);

        // 성공 시 임시 ID를 실제 ID로 교체
        setFlatComments((prev) => {
          const next = prev.map((comment) =>
            comment.id === tempId
              ? {
                  ...comment,
                  id: saved.id,
                  createdAt: saved.created_at,
                  updatedAt: saved.updated_at,
                }
              : comment
          );
          writeComments(targetKey, next);
          return next;
        });
      } catch (error: any) {
        console.warn('Supabase unavailable, keeping optimistic update:', error?.message);
        // Supabase 실패해도 optimistic update는 유지
        // 단, localStorage에는 영구 ID로 저장
        setFlatComments((prev) => {
          const next = prev.map((comment) =>
            comment.id === tempId
              ? { ...comment, id: crypto.randomUUID() }
              : comment
          );
          writeComments(targetKey, next);
          return next;
        });
      }
    },
    [targetId, targetType, targetKey, setAuthorName]
  );

  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      // ✨ Optimistic Update: 즉시 로컬 상태 수정
      const now = new Date().toISOString();
      const previousComments = flatComments;

      setFlatComments((prev) => {
        const next = prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, content: trimmed, updatedAt: now }
            : comment
        );
        writeComments(targetKey, next);
        return next;
      });

      try {
        // 백그라운드에서 Supabase 업데이트
        await updateCommentAPI(commentId, trimmed);
      } catch (error: any) {
        console.warn('Supabase update failed, optimistic update preserved:', error?.message);
        // 실패해도 optimistic update는 유지 (이미 localStorage에 저장됨)
      }
    },
    [flatComments, targetKey]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      // ✨ Optimistic Update: 즉시 로컬 상태에서 삭제
      const previousComments = flatComments;

      setFlatComments((prev) => {
        const toRemove = collectDescendants(prev, commentId);
        const next = prev.filter((comment) => !toRemove.has(comment.id));
        writeComments(targetKey, next);
        return next;
      });

      try {
        // 백그라운드에서 Supabase 삭제
        await deleteCommentAPI(commentId);
      } catch (error: any) {
        console.warn('Supabase delete failed, optimistic delete preserved:', error?.message);
        // 실패해도 optimistic delete는 유지 (이미 localStorage에서 삭제됨)
      }
    },
    [flatComments, targetKey]
  );

  const reload = useCallback(() => {
    load();
  }, [load]);

  return {
    comments,
    loading,
    authorName,
    setAuthorName,
    addComment,
    updateComment,
    deleteComment,
    reload,
  };
}
