// Project Metrics Calculation Utilities

import type { DevProject, ProjectStatus } from '@/types/developer';

export interface ProjectSummary {
  total: number;
  active: number;
  paused: number;
  completed: number;
  difficult: number;
  avgProgress: number;
}

/**
 * 프로젝트 배열로부터 요약 통계 계산
 */
export function calculateProjectSummary(projects: DevProject[]): ProjectSummary {
  if (projects.length === 0) {
    return {
      total: 0,
      active: 0,
      paused: 0,
      completed: 0,
      difficult: 0,
      avgProgress: 0,
    };
  }

  const statusCounts = projects.reduce(
    (acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    },
    {} as Record<ProjectStatus, number>
  );

  const totalProgress = projects.reduce((sum, project) => {
    const completedStages = project.stages.filter(s => s.isCompleted).length;
    const progress = project.stages.length > 0
      ? (completedStages / project.stages.length) * 100
      : 0;
    return sum + progress;
  }, 0);

  const avgProgress = Math.round(totalProgress / projects.length);

  return {
    total: projects.length,
    active: statusCounts.active || 0,
    paused: statusCounts.paused || 0,
    completed: statusCounts.completed || 0,
    difficult: statusCounts.difficult || 0,
    avgProgress,
  };
}

/**
 * 개별 프로젝트의 진행률 계산
 */
export function calculateProjectProgress(project: DevProject): number {
  if (project.stages.length === 0) return 0;

  const completedStages = project.stages.filter(s => s.isCompleted).length;
  return Math.round((completedStages / project.stages.length) * 100);
}
