// useProjects - 필터링 및 페이지네이션 기능이 있는 프로젝트 훅
import { useState, useEffect } from 'react';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  completeProjectStage,
} from '../supabase/developer';
import type { DevProject, ProjectFormData, ProjectStatus } from '@/types/developer';

interface UseProjectsResult {
  projects: DevProject[];
  loading: boolean;
  error: Error | null;
  filter: ProjectStatus | 'all';
  setFilter: (filter: ProjectStatus | 'all') => void;
  page: number;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<void>;
  createNewProject: (data: ProjectFormData) => Promise<void>;
  updateProjectItem: (id: string, data: Partial<ProjectFormData>) => Promise<void>;
  deleteProjectItem: (id: string) => Promise<void>;
  completeStage: (projectId: string, stageId: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 3;

export function useProjects(): UseProjectsResult {
  const [allProjects, setAllProjects] = useState<DevProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const fetchAllProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjects(1000, 0);
      setAllProjects(data);
      setPage(1);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProjects();
  }, []);

  // 필터링된 프로젝트
  const filteredProjects = filter === 'all'
    ? allProjects
    : allProjects.filter(project => project.status === filter);

  // 페이지네이션된 프로젝트
  const startIndex = 0;
  const endIndex = page * ITEMS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
  const hasMore = endIndex < filteredProjects.length;

  const createNewProject = async (data: ProjectFormData) => {
    try {
      const newProject = await createProject(data);
      setAllProjects((prev) => [newProject, ...prev]);
    } catch (err) {
      console.error('Failed to create project:', err);
      throw err;
    }
  };

  const updateProjectItem = async (id: string, data: Partial<ProjectFormData>) => {
    try {
      const updated = await updateProject(id, data);
      setAllProjects((prev) =>
        prev.map(project => (project.id === id ? updated : project))
      );
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  };

  const deleteProjectItem = async (id: string) => {
    try {
      await deleteProject(id);
      setAllProjects((prev) => prev.filter(project => project.id !== id));
    } catch (err) {
      console.error('Failed to delete project:', err);
      throw err;
    }
  };

  const completeStage = async (projectId: string, stageId: string) => {
    try {
      const updated = await completeProjectStage(projectId, stageId);
      setAllProjects((prev) =>
        prev.map(project => (project.id === projectId ? updated : project))
      );
    } catch (err) {
      console.error('Failed to complete stage:', err);
      throw err;
    }
  };

  return {
    projects: paginatedProjects,
    loading,
    error,
    filter,
    setFilter: (newFilter) => {
      setFilter(newFilter);
      setPage(1);
    },
    page,
    hasMore,
    loadMore: () => setPage(prev => prev + 1),
    refetch: fetchAllProjects,
    createNewProject,
    updateProjectItem,
    deleteProjectItem,
    completeStage,
  };
}
