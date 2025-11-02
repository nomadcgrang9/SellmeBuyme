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

      try {
        setAuthorName(trimmedName);
        await createCommentAPI(targetType, targetId, trimmedContent, trimmedName, parentId);
        await load();
      } catch (error: any) {
        console.warn('Supabase unavailable, saving to localStorage:', error?.message);
        // Supabase 실패 시 로컬 스토리지에 저장
        const now = new Date().toISOString();
        const comment: StoredComment = {
          id: crypto.randomUUID(),
          parentId: parentId ?? null,
          targetType,
          targetId,
          authorName: trimmedName,
          content: trimmedContent,
          createdAt: now,
          updatedAt: now,
        };
        setAuthorName(trimmedName);
        setFlatComments((prev) => {
          const next = [...prev, comment];
          writeComments(targetKey, next);
          return next;
        });
      }
    },
    [targetId, targetType, targetKey, setAuthorName, load]
  );

  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      try {
        await updateCommentAPI(commentId, trimmed);
        await load();
      } catch (error: any) {
        console.warn('Supabase unavailable, updating localStorage:', error?.message);
        // Supabase 실패 시 로컬 스토리지에서 업데이트
        setFlatComments((prev) => {
          const next = prev.map((comment) =>
            comment.id === commentId
              ? { ...comment, content: trimmed, updatedAt: new Date().toISOString() }
              : comment
          );
          writeComments(targetKey, next);
          return next;
        });
      }
    },
    [load, targetKey]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteCommentAPI(commentId);
        await load();
      } catch (error: any) {
        console.warn('Supabase unavailable, deleting from localStorage:', error?.message);
        // Supabase 실패 시 로컬 스토리지에서 삭제
        setFlatComments((prev) => {
          const toRemove = collectDescendants(prev, commentId);
          const next = prev.filter((comment) => !toRemove.has(comment.id));
          writeComments(targetKey, next);
          return next;
        });
      }
    },
    [load, targetKey]
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
