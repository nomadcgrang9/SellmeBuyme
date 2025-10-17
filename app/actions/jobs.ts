'use server'

import { createClient } from '@/lib/supabase/server'
import { Card } from '@/types'

export async function getJobs(filters?: {
  location?: string
  tags?: string[]
  isUrgent?: boolean
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('job_postings')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (filters?.location) {
    query = query.ilike('location', `%${filters.location}%`)
  }
  
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }
  
  if (filters?.isUrgent !== undefined) {
    query = query.eq('is_urgent', filters.isUrgent)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching jobs:', error)
    return []
  }
  
  // DB 데이터를 Card 타입으로 변환
  return data.map(job => ({
    id: job.id,
    type: 'job' as const,
    isUrgent: job.is_urgent,
    organization: job.organization,
    title: job.title,
    tags: job.tags.slice(0, 2), // 최대 2개만
    location: job.location,
    compensation: job.compensation,
    deadline: job.deadline,
    daysLeft: job.deadline ? calculateDaysLeft(job.deadline) : undefined,
  })) as Card[]
}

export async function getTalents(filters?: {
  location?: string
  tags?: string[]
  isVerified?: boolean
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('talents')
    .select('*')
    .order('rating', { ascending: false })
  
  if (filters?.location) {
    query = query.contains('location', [filters.location])
  }
  
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }
  
  if (filters?.isVerified !== undefined) {
    query = query.eq('is_verified', filters.isVerified)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching talents:', error)
    return []
  }
  
  // DB 데이터를 Card 타입으로 변환
  return data.map(talent => ({
    id: talent.id,
    type: 'talent' as const,
    isVerified: talent.is_verified,
    name: talent.name,
    specialty: talent.specialty,
    tags: talent.tags.slice(0, 2), // 최대 2개만
    location: talent.location.join('/'),
    experience: `경력 ${talent.experience_years}년`,
    rating: talent.rating,
    reviewCount: talent.review_count,
  })) as Card[]
}

export async function getAllCards() {
  const [jobs, talents] = await Promise.all([
    getJobs(),
    getTalents()
  ])
  
  // 공고와 인력을 섞어서 반환
  return [...jobs, ...talents].sort(() => Math.random() - 0.5)
}

export async function getAIRecommendations() {
  const supabase = await createClient()
  
  // 긴급 공고 우선
  const { data: urgentJobs } = await supabase
    .from('job_postings')
    .select('*')
    .eq('is_urgent', true)
    .limit(2)
  
  // 인증된 인력
  const { data: verifiedTalents } = await supabase
    .from('talents')
    .select('*')
    .eq('is_verified', true)
    .order('rating', { ascending: false })
    .limit(2)
  
  // 최신 공고
  const { data: recentJobs } = await supabase
    .from('job_postings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2)
  
  const recommendations: Card[] = []
  
  // 긴급 공고 추가
  urgentJobs?.forEach(job => {
    recommendations.push({
      id: job.id,
      type: 'job',
      isUrgent: true,
      organization: job.organization,
      title: job.title,
      tags: job.tags.slice(0, 2),
      location: job.location,
      compensation: job.compensation,
      deadline: job.deadline,
      daysLeft: calculateDaysLeft(job.deadline),
    })
  })
  
  // 인증된 인력 추가
  verifiedTalents?.forEach(talent => {
    recommendations.push({
      id: talent.id,
      type: 'talent',
      isVerified: true,
      name: talent.name,
      specialty: talent.specialty,
      tags: talent.tags.slice(0, 2),
      location: talent.location.join('/'),
      experience: `경력 ${talent.experience_years}년`,
      rating: talent.rating,
      reviewCount: talent.review_count,
    })
  })
  
  // 최신 공고 추가
  recentJobs?.forEach(job => {
    if (!recommendations.find(r => r.id === job.id)) {
      recommendations.push({
        id: job.id,
        type: 'job',
        isUrgent: job.is_urgent,
        organization: job.organization,
        title: job.title,
        tags: job.tags.slice(0, 2),
        location: job.location,
        compensation: job.compensation,
        deadline: job.deadline,
      })
    }
  })
  
  return recommendations.slice(0, 6) // 최대 6개
}

// 마감일까지 남은 일수 계산
function calculateDaysLeft(deadline: string): number | undefined {
  if (!deadline) return undefined
  
  const today = new Date()
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays > 0 ? diffDays : undefined
}
