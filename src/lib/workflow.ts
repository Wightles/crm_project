import type { TaskStatus, UserRole } from '../types'

export type TaskAction = {
  status: TaskStatus
  label: string
  hint: string
}

export function getAvailableTaskActions(status: TaskStatus, role: UserRole): TaskAction[] {
  // интерфейс показывает только те действия, которые разрешены для текущей роли
  if (role === 'executor' && status === 'new') {
    return [{ status: 'in_progress', label: 'Взять в работу', hint: 'Задача перейдёт в статус «В работе».' }]
  }

  if (role === 'executor' && status === 'in_progress') {
    return [{ status: 'in_review', label: 'Отправить на проверку', hint: 'После выполнения передайте задачу постановщику.' }]
  }

  if (role === 'executor' && status === 'rework') {
    return [{ status: 'in_progress', label: 'Вернуть в работу', hint: 'После исправлений снова возьмите задачу в работу.' }]
  }

  if (role === 'manager' && status === 'in_review') {
    return [
      { status: 'accepted', label: 'Принять задачу', hint: 'Задача будет отмечена как выполненная.' },
      { status: 'rework', label: 'Вернуть на доработку', hint: 'Комментарий объяснит исполнителю, что исправить.' },
    ]
  }

  return []
}

export function isAllowedTransition(from: TaskStatus, to: TaskStatus, role: UserRole) {
  return getAvailableTaskActions(from, role).some((action) => action.status === to)
}
