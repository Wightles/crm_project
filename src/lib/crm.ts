import type { AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { ConstructionObject, Profile, TaskStatus } from '../types'

export type DashboardTask = {
  id: string
  title: string
  object: string
  assignee: string
  status: string
  createdAt: string
}

export type DashboardData = {
  objectCount: number
  tasks: DashboardTask[]
}

export const statusLabels: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
}

export async function signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
  if (!supabase) return { error: new Error('Supabase не настроен') as AuthError }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return { error }
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId: string): Promise<Profile> {
  if (!supabase) throw new Error('Supabase не настроен')

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function loadDashboardData(): Promise<DashboardData> {
  if (!supabase) throw new Error('Supabase не настроен')

  const [objectsResult, tasksResult, profilesResult] = await Promise.all([
    supabase.from('construction_objects').select('*').order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*'),
  ])

  if (objectsResult.error) throw objectsResult.error
  if (tasksResult.error) throw tasksResult.error
  if (profilesResult.error) throw profilesResult.error

  const objects = objectsResult.data as ConstructionObject[]
  const objectNames = new Map(objects.map((item) => [item.id, item.name]))
  const profileNames = new Map(profilesResult.data.map((item) => [item.id, item.full_name]))

  return {
    objectCount: objects.length,
    tasks: tasksResult.data.map((task) => ({
      id: task.id,
      title: task.title,
      object: objectNames.get(task.object_id) ?? 'Объект не найден',
      assignee: profileNames.get(task.assignee_id) ?? 'Исполнитель не найден',
      status: statusLabels[task.status],
      createdAt: formatDate(task.created_at),
    })),
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
