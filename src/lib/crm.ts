import type { AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { ConstructionObject, Profile, TaskStatus } from '../types'

export type DashboardTask = {
  id: string
  title: string
  object: string
  objectId: string
  assignee: string
  assigneeId: string
  description: string
  statusCode: TaskStatus
  status: string
  createdAt: string
}

export type DashboardObject = {
  id: string
  name: string
  address: string
  taskCount: number
}

export type TaskHistoryItem = {
  id: string
  fromStatus: TaskStatus | null
  toStatus: TaskStatus
  comment: string | null
  changedBy: string
  changedAt: string
}

export type DashboardData = {
  objects: DashboardObject[]
  executors: Profile[]
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

  // отдельные запросы оставляем под rls, чтобы база сама ограничивала данные
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

  const tasks = tasksResult.data.map((task) => ({
      id: task.id,
      title: task.title,
      object: objectNames.get(task.object_id) ?? 'Объект не найден',
      objectId: task.object_id,
      assignee: profileNames.get(task.assignee_id) ?? 'Исполнитель не найден',
      assigneeId: task.assignee_id,
      description: task.description,
      statusCode: task.status,
      status: statusLabels[task.status],
      createdAt: formatDate(task.created_at),
    }))

  const taskCounts = new Map<string, number>()
  for (const task of tasks) taskCounts.set(task.objectId, (taskCounts.get(task.objectId) ?? 0) + 1)

  return {
    objects: objects.map((object) => ({
      id: object.id,
      name: object.name,
      address: object.address,
      taskCount: taskCounts.get(object.id) ?? 0,
    })),
    executors: profilesResult.data.filter((profile) => profile.role === 'executor'),
    tasks,
  }
}

export async function createObject(name: string, address: string, createdBy: string) {
  if (!supabase) throw new Error('Supabase не настроен')
  const { data, error } = await supabase
    .from('construction_objects')
    .insert({ name, address, created_by: createdBy })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function createTask(input: {
  title: string
  description: string
  objectId: string
  assigneeId: string
  createdBy: string
}) {
  if (!supabase) throw new Error('Supabase не настроен')
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description,
      object_id: input.objectId,
      assignee_id: input.assigneeId,
      created_by: input.createdBy,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateObject(id: string, name: string, address: string) {
  if (!supabase) throw new Error('Supabase не настроен')
  const { error } = await supabase
    .from('construction_objects')
    .update({ name, address })
    .eq('id', id)

  if (error) throw error
}

export async function deleteObject(id: string) {
  if (!supabase) throw new Error('Supabase не настроен')
  const { error } = await supabase.from('construction_objects').delete().eq('id', id)
  if (error) throw error
}

export async function updateTask(input: {
  id: string
  title: string
  description: string
  objectId: string
  assigneeId: string
}) {
  if (!supabase) throw new Error('Supabase не настроен')
  const { error } = await supabase
    .from('tasks')
    .update({
      title: input.title,
      description: input.description,
      object_id: input.objectId,
      assignee_id: input.assigneeId,
    })
    .eq('id', input.id)

  if (error) throw error
}

export async function deleteTask(id: string) {
  if (!supabase) throw new Error('Supabase не настроен')
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function changeTaskStatus(taskId: string, status: TaskStatus, comment = '') {
  if (!supabase) throw new Error('Supabase не настроен')
  const { error } = await supabase.rpc('change_task_status', {
    p_task_id: taskId,
    p_new_status: status,
    p_comment: comment || undefined,
  })

  if (error) throw error
}

export async function getTaskHistory(taskId: string): Promise<TaskHistoryItem[]> {
  if (!supabase) throw new Error('Supabase не настроен')

  const { data, error } = await supabase
    .from('task_status_history')
    .select('*')
    .eq('task_id', taskId)
    .order('changed_at', { ascending: false })

  if (error) throw error

  const userIds = [...new Set(data.map((item) => item.changed_by))]
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  if (profilesError) throw profilesError
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.full_name]))

  return data.map((item) => ({
    id: item.id,
    fromStatus: item.from_status,
    toStatus: item.to_status,
    comment: item.comment,
    changedBy: profileNames.get(item.changed_by) ?? 'Пользователь',
    changedAt: formatDate(item.changed_at),
  }))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
