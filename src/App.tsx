import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import {
  changeTaskStatus,
  createObject,
  createTask,
  deleteObject,
  deleteTask,
  getProfile,
  getTaskHistory,
  loadDashboardData,
  signIn,
  signOut,
  statusLabels,
  updateObject,
  updateTask,
  type DashboardData,
  type DashboardObject,
  type DashboardTask,
  type TaskHistoryItem,
} from './lib/crm'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { getAvailableTaskActions } from './lib/workflow'
import type { Profile, TaskStatus } from './types'

const demoTasksSeed: DashboardTask[] = [
  { id: '1', title: 'Подготовить чертежи лестницы', object: 'ЖК «Северный парк»', objectId: 'object-1', assignee: 'Иван Петров', assigneeId: 'executor-1', description: 'Подготовить комплект чертежей для передачи на согласование.', statusCode: 'in_review', status: 'На проверке', createdAt: 'Сегодня, 09:42' },
  { id: '2', title: 'Проверить поставку окон', object: 'Коттедж на Лесной', objectId: 'object-2', assignee: 'Анна Смирнова', assigneeId: 'executor-2', description: 'Сверить количество и размеры окон с накладной.', statusCode: 'in_progress', status: 'В работе', createdAt: 'Вчера, 16:20' },
  { id: '3', title: 'Согласовать цвет фасада', object: 'ЖК «Северный парк»', objectId: 'object-1', assignee: 'Иван Петров', assigneeId: 'executor-1', description: 'Получить финальное решение по цвету фасада.', statusCode: 'new', status: 'Новая', createdAt: 'Вчера, 11:05' },
  { id: '4', title: 'Принять исполнительную документацию', object: 'Офисный центр «Маяк»', objectId: 'object-3', assignee: 'Анна Смирнова', assigneeId: 'executor-2', description: 'Проверить комплект исполнительной документации.', statusCode: 'accepted', status: 'Принята', createdAt: '12 нояб., 14:10' },
]

const demoObjectsSeed: DashboardObject[] = [
  { id: 'object-1', name: 'ЖК «Северный парк»', address: 'ул. Лесная, 18', taskCount: 2 },
  { id: 'object-2', name: 'Коттедж на Лесной', address: 'Лесная, 42', taskCount: 1 },
  { id: 'object-3', name: 'Офисный центр «Маяк»', address: 'пр. Мира, 7', taskCount: 1 },
]

const demoExecutors: Profile[] = [
  { id: 'executor-1', full_name: 'Иван Петров', role: 'executor', created_at: '' },
  { id: 'executor-2', full_name: 'Анна Смирнова', role: 'executor', created_at: '' },
]

const statusClass: Record<string, string> = {
  Новая: 'status-new',
  'В работе': 'status-progress',
  'На проверке': 'status-review',
  Принята: 'status-done',
  'На доработке': 'status-rework',
}

function App() {
  const [activeSection, setActiveSection] = useState('Обзор')
  const [search, setSearch] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [liveData, setLiveData] = useState<DashboardData | null>(null)
  const [demoTasks, setDemoTasks] = useState(demoTasksSeed)
  const [demoObjects, setDemoObjects] = useState(demoObjectsSeed)
  const [selectedTask, setSelectedTask] = useState<DashboardTask | null>(null)
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [objectFilter, setObjectFilter] = useState<string | null>(null)
  const [showObjectForm, setShowObjectForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingObject, setEditingObject] = useState<DashboardObject | null>(null)
  const [editingTask, setEditingTask] = useState<DashboardTask | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [actionBusy, setActionBusy] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    let mounted = true
    // после входа загружаем профиль и только доступные пользователю данные
    const loadUserData = async (userId: string) => {
      try {
        const [nextProfile, dashboard] = await Promise.all([getProfile(userId), loadDashboardData()])
        if (!mounted) return
        setProfile(nextProfile)
        setLiveData(dashboard)
        setError(null)
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить данные')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) void loadUserData(data.session.user.id)
      else setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (nextSession) window.setTimeout(() => void loadUserData(nextSession.user.id), 0)
      else {
        setProfile(null)
        setLiveData(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function refreshData() {
    if (!supabase) return
    const dashboard = await loadDashboardData()
    setLiveData(dashboard)
  }

  async function handleSignIn(email: string, password: string) {
    setAuthBusy(true)
    setError(null)
    const result = await signIn(email, password)
    if (result.error) setError(getAuthErrorMessage(result.error.message))
    setAuthBusy(false)
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Не удалось выйти из системы')
    }
  }

  async function handleSaveObject(name: string, address: string, objectId?: string) {
    setActionBusy(true)
    setError(null)
    try {
      if (!name || !address) throw new Error('Заполните название и адрес объекта')
      if (isSupabaseConfigured && session) {
        if (objectId) await updateObject(objectId, name, address)
        else await createObject(name, address, session.user.id)
        await refreshData()
      } else {
        if (objectId) {
          setDemoObjects((items) => items.map((item) => item.id === objectId ? { ...item, name, address } : item))
          setDemoTasks((items) => items.map((task) => task.objectId === objectId ? { ...task, object: name } : task))
        } else {
          setDemoObjects((items) => [{ id: crypto.randomUUID(), name, address, taskCount: 0 }, ...items])
        }
      }
      setShowObjectForm(false)
      setEditingObject(null)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Не удалось создать объект')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleSaveTask(title: string, description: string, objectId: string, assigneeId: string, taskId?: string) {
    setActionBusy(true)
    setError(null)
    try {
      if (!title) throw new Error('Введите название задачи')
      const object = objects.find((item) => item.id === objectId)
      const assignee = executors.find((item) => item.id === assigneeId)
      if (!object || !assignee) throw new Error('Выберите объект и исполнителя')

      if (isSupabaseConfigured && session) {
        if (taskId) await updateTask({ id: taskId, title, description, objectId, assigneeId })
        else await createTask({ title, description, objectId, assigneeId, createdBy: session.user.id })
        await refreshData()
      } else {
        if (taskId) {
          const oldTask = demoTasks.find((item) => item.id === taskId)
          setDemoTasks((items) => items.map((item) => item.id === taskId ? { ...item, title, description, object: object.name, objectId, assignee: assignee.full_name, assigneeId } : item))
          if (oldTask && oldTask.objectId !== objectId) {
            setDemoObjects((items) => items.map((item) => {
              if (item.id === oldTask.objectId) return { ...item, taskCount: Math.max(0, item.taskCount - 1) }
              if (item.id === objectId) return { ...item, taskCount: item.taskCount + 1 }
              return item
            }))
          }
        } else {
          setDemoTasks((items) => [{
            id: crypto.randomUUID(),
            title,
            object: object.name,
            objectId,
            assignee: assignee.full_name,
            assigneeId,
            description,
            statusCode: 'new',
            status: statusLabels.new,
            createdAt: 'Только что',
          }, ...items])
          setDemoObjects((items) => items.map((item) => item.id === objectId ? { ...item, taskCount: item.taskCount + 1 } : item))
        }
      }
      setShowTaskForm(false)
      setEditingTask(null)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Не удалось создать задачу')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleDeleteObject(object: DashboardObject) {
    if (!window.confirm(`Удалить объект «${object.name}» и его задачи?`)) return
    setActionBusy(true)
    setError(null)
    try {
      if (isSupabaseConfigured) {
        await deleteObject(object.id)
        await refreshData()
      } else {
        setDemoObjects((items) => items.filter((item) => item.id !== object.id))
        setDemoTasks((items) => items.filter((item) => item.objectId !== object.id))
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить объект')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleDeleteTask(task: DashboardTask) {
    if (!window.confirm(`Удалить задачу «${task.title}»?`)) return
    setActionBusy(true)
    setError(null)
    try {
      if (isSupabaseConfigured) {
        await deleteTask(task.id)
        await refreshData()
      } else {
        setDemoTasks((items) => items.filter((item) => item.id !== task.id))
        setDemoObjects((items) => items.map((item) => item.id === task.objectId ? { ...item, taskCount: Math.max(0, item.taskCount - 1) } : item))
      }
      setSelectedTask(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить задачу')
    } finally {
      setActionBusy(false)
    }
  }

  async function openTask(task: DashboardTask) {
    setSelectedTask(task)
    setTaskHistory([])
    if (isSupabaseConfigured) {
      setActionBusy(true)
      try {
        setTaskHistory(await getTaskHistory(task.id))
      } catch (historyError) {
        setError(historyError instanceof Error ? historyError.message : 'Не удалось загрузить историю')
      } finally {
        setActionBusy(false)
      }
    }
  }

  async function handleStatusChange(status: TaskStatus, comment: string) {
    if (!selectedTask) return
    setActionBusy(true)
    setError(null)
    try {
      if (isSupabaseConfigured) {
        await changeTaskStatus(selectedTask.id, status, comment)
        await refreshData()
        setSelectedTask(null)
      } else {
        const changedAt = 'Только что'
        setDemoTasks((items) => items.map((task) => task.id === selectedTask.id ? { ...task, statusCode: status, status: statusLabels[status] } : task))
        setTaskHistory((items) => [{ id: crypto.randomUUID(), fromStatus: selectedTask.statusCode, toStatus: status, comment: comment || null, changedBy: 'Алексей Кузнецов', changedAt }, ...items])
        setSelectedTask((task) => task ? { ...task, statusCode: status, status: statusLabels[status] } : task)
      }
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Не удалось изменить статус')
    } finally {
      setActionBusy(false)
    }
  }

  const isLive = isSupabaseConfigured && Boolean(session)
  const tasks = isLive ? liveData?.tasks ?? [] : demoTasks
  const objects = isLive ? liveData?.objects ?? [] : demoObjects
  const executors = isLive ? liveData?.executors ?? [] : demoExecutors
  const userName = profile?.full_name ?? 'Алексей Кузнецов'
  const userRole = profile?.role === 'executor' ? 'executor' : 'manager'
  const initials = userName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesObject = !objectFilter || task.objectId === objectFilter
      const matchesQuery = !query || [task.title, task.object, task.assignee, task.status].join(' ').toLowerCase().includes(query)
      return matchesObject && matchesQuery
    })
  }, [objectFilter, search, tasks])
  const completedCount = tasks.filter((task) => task.statusCode === 'accepted').length

  if (isSupabaseConfigured && loading) return <main className="loading-page"><div className="loading-indicator">Загружаем рабочее пространство...</div></main>
  if (isSupabaseConfigured && !session) return <AuthScreen busy={authBusy} error={error} onSubmit={handleSignIn} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">ОТ</div><div><strong>Объекты</strong><span>и задачи</span></div></div>
        <nav className="main-nav" aria-label="Основная навигация">
          <NavItem icon={<LayoutDashboard size={18} />} label="Обзор" active={activeSection === 'Обзор'} onClick={() => { setActiveSection('Обзор'); setObjectFilter(null) }} />
          <NavItem icon={<Building2 size={18} />} label="Объекты" active={activeSection === 'Объекты'} onClick={() => setActiveSection('Объекты')} />
          <NavItem icon={<ClipboardList size={18} />} label="Мои задачи" active={activeSection === 'Мои задачи'} onClick={() => { setActiveSection('Мои задачи'); setObjectFilter(null) }} />
        </nav>
        <div className="sidebar-footer">
          <NavItem icon={<Settings size={18} />} label="Настройки" active={activeSection === 'Настройки'} onClick={() => setActiveSection('Настройки')} />
          <div className="profile-card"><span className="avatar avatar-blue">{initials}</span><span className="profile-copy"><strong>{userName}</strong><small>{userRole === 'executor' ? 'Исполнитель' : 'Постановщик'}</small></span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">Рабочее пространство</p><h1>{activeSection}</h1></div>
          <div className="topbar-actions">{!isLive && <span className="demo-label">Демо-режим</span>}{error && <span className="topbar-error" role="alert">{error}</span>}{isLive && <button className="icon-button" type="button" aria-label="Выйти" title="Выйти" onClick={() => void handleSignOut()}><LogOut size={18} /></button>}</div>
        </header>

        <section className="page-content">
          {activeSection === 'Объекты' ? (
            <ObjectsPanel objects={objects} manager={userRole === 'manager'} onAdd={() => setShowObjectForm(true)} onEdit={setEditingObject} onDelete={(object) => void handleDeleteObject(object)} onSelect={(id) => { setObjectFilter(id); setActiveSection('Обзор') }} />
          ) : activeSection === 'Настройки' ? (
            <SettingsPanel profile={profile} demo={!isLive} />
          ) : (
            <>
              <div className="summary-grid">
                <SummaryCard icon={<Building2 size={20} />} label="Всего объектов" value={String(objects.length)} note={isLive ? 'Доступные вам объекты' : 'Демо-данные'} tone="blue" />
                <SummaryCard icon={<ClipboardList size={20} />} label="Всего задач" value={String(tasks.length)} note={userRole === 'executor' ? 'Только назначенные вам' : 'Задачи рабочего списка'} tone="violet" />
                <SummaryCard icon={<CheckCircle2 size={20} />} label="Выполнено" value={String(completedCount)} note={tasks.length ? `${Math.round((completedCount / tasks.length) * 100)}% от списка` : 'Пока нет задач'} tone="green" />
              </div>
              <TasksPanel tasks={visibleTasks} manager={userRole === 'manager'} search={search} objectFilter={objectFilter} onSearch={setSearch} onClearObjectFilter={() => setObjectFilter(null)} onAdd={() => setShowTaskForm(true)} onSelect={openTask} />
            </>
          )}
        </section>
      </main>

      {(showObjectForm || editingObject) && <ObjectForm object={editingObject} busy={actionBusy} onClose={() => { setShowObjectForm(false); setEditingObject(null) }} onSubmit={handleSaveObject} />}
      {(showTaskForm || editingTask) && <TaskForm task={editingTask} objects={objects} executors={executors} busy={actionBusy} onClose={() => { setShowTaskForm(false); setEditingTask(null) }} onSubmit={handleSaveTask} />}
      {selectedTask && <TaskModal task={selectedTask} history={taskHistory} role={userRole} busy={actionBusy} onClose={() => setSelectedTask(null)} onEdit={() => { setEditingTask(selectedTask); setSelectedTask(null) }} onDelete={() => void handleDeleteTask(selectedTask)} onStatusChange={handleStatusChange} />}
    </div>
  )
}

function getAuthErrorMessage(message: string) {
  if (message.toLowerCase().includes('invalid login credentials')) return 'Неверный email или пароль'
  if (message.toLowerCase().includes('email not confirmed')) return 'Email пользователя ещё не подтверждён'
  return message
}

type TasksPanelProps = { tasks: DashboardTask[]; manager: boolean; search: string; objectFilter: string | null; onSearch: (value: string) => void; onClearObjectFilter: () => void; onAdd: () => void; onSelect: (task: DashboardTask) => void }

function TasksPanel({ tasks, manager, search, objectFilter, onSearch, onClearObjectFilter, onAdd, onSelect }: TasksPanelProps) {
  return <section className="panel tasks-panel"><div className="panel-heading"><div><p className="eyebrow">Рабочий список</p><h2>{objectFilter ? 'Задачи объекта' : 'Последние задачи'}</h2></div>{manager && <button className="primary-button" type="button" onClick={onAdd}><Plus size={17} />Новая задача</button>}</div><div className="table-toolbar"><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Поиск по задачам" /></label>{objectFilter && <button className="filter-button" type="button" onClick={onClearObjectFilter}>Сбросить фильтр<X size={15} /></button>}</div><div className="table-wrap"><table><thead><tr><th>Задача</th><th>Объект</th><th>Исполнитель</th><th>Статус</th><th>Создана</th></tr></thead><tbody>{tasks.length ? tasks.map((task) => <tr key={task.id}><td><button className="task-link" type="button" onClick={() => onSelect(task)}>{task.title}</button></td><td className="muted-cell">{task.object}</td><td><span className="assignee-cell"><span className="avatar avatar-small">{task.assignee.split(' ').map((name) => name[0]).join('')}</span>{task.assignee}</span></td><td><span className={`status-pill ${statusClass[task.status] ?? 'status-new'}`}>{task.status}</span></td><td className="muted-cell">{task.createdAt}</td></tr>) : <tr><td colSpan={5} className="empty-cell">Задач пока нет</td></tr>}</tbody></table></div></section>
}

function ObjectsPanel({ objects, manager, onAdd, onEdit, onDelete, onSelect }: { objects: DashboardObject[]; manager: boolean; onAdd: () => void; onEdit: (object: DashboardObject) => void; onDelete: (object: DashboardObject) => void; onSelect: (id: string) => void }) {
  return <section className="objects-section"><div className="section-heading"><div><p className="eyebrow">Строительные площадки</p><h2>Объекты</h2></div>{manager && <button className="primary-button" type="button" onClick={onAdd}><Plus size={17} />Новый объект</button>}</div><div className="object-grid">{objects.length ? objects.map((object) => <article className="object-card" key={object.id}><button className="object-card-main" type="button" onClick={() => onSelect(object.id)}><div className="object-card-top"><span className="object-icon"><Building2 size={20} /></span><span className="object-task-count">{object.taskCount} задач</span></div><strong>{object.name}</strong><span className="object-address"><MapPin size={14} />{object.address}</span><span className="object-link">Открыть задачи</span></button>{manager && <div className="object-actions"><button type="button" onClick={() => onEdit(object)}><Pencil size={14} />Изменить</button><button type="button" className="danger-link" onClick={() => onDelete(object)}><Trash2 size={14} />Удалить</button></div>}</article>) : <div className="panel empty-state">Объектов пока нет</div>}</div></section>
}

function SettingsPanel({ profile, demo }: { profile: Profile | null; demo: boolean }) {
  return <section className="panel settings-panel"><div className="settings-icon"><Settings size={20} /></div><p className="eyebrow">Профиль</p><h2>{profile?.full_name ?? 'Алексей Кузнецов'}</h2><p className="settings-description">Роль: {profile?.role === 'executor' ? 'исполнитель' : 'постановщик'}. {demo ? 'Сейчас открыт демонстрационный режим.' : 'Данные загружены из Supabase.'}</p></section>
}

function ObjectForm({ object, busy, onClose, onSubmit }: { object: DashboardObject | null; busy: boolean; onClose: () => void; onSubmit: (name: string, address: string, objectId?: string) => Promise<void> }) {
  const [name, setName] = useState(object?.name ?? '')
  const [address, setAddress] = useState(object?.address ?? '')
  return <Modal title={object ? 'Редактирование объекта' : 'Новый объект'} onClose={onClose}><form className="entity-form" onSubmit={(event) => { event.preventDefault(); void onSubmit(name.trim(), address.trim(), object?.id) }}><Field label="Название объекта"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, ЖК «Северный парк»" required /></Field><Field label="Адрес"><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Город, улица, дом" required /></Field><FormActions busy={busy} onClose={onClose} submitLabel={object ? 'Сохранить' : 'Создать объект'} /></form></Modal>
}

function TaskForm({ task, objects, executors, busy, onClose, onSubmit }: { task: DashboardTask | null; objects: DashboardObject[]; executors: Profile[]; busy: boolean; onClose: () => void; onSubmit: (title: string, description: string, objectId: string, assigneeId: string, taskId?: string) => Promise<void> }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [objectId, setObjectId] = useState(task?.objectId ?? objects[0]?.id ?? '')
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? executors[0]?.id ?? '')
  return <Modal title={task ? 'Редактирование задачи' : 'Новая задача'} onClose={onClose}><form className="entity-form" onSubmit={(event) => { event.preventDefault(); void onSubmit(title.trim(), description.trim(), objectId, assigneeId, task?.id) }}><Field label="Название задачи"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Что нужно сделать" required /></Field><Field label="Описание"><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Коротко опишите результат" rows={4} /></Field><Field label="Объект"><select value={objectId} onChange={(event) => setObjectId(event.target.value)} required>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></Field><Field label="Исполнитель"><select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} required>{executors.length ? executors.map((executor) => <option key={executor.id} value={executor.id}>{executor.full_name}</option>) : <option value="">Нет доступных исполнителей</option>}</select></Field><FormActions busy={busy} onClose={onClose} submitLabel={task ? 'Сохранить' : 'Создать задачу'} /></form></Modal>
}

function TaskModal({ task, history, role, busy, onClose, onEdit, onDelete, onStatusChange }: { task: DashboardTask; history: TaskHistoryItem[]; role: 'manager' | 'executor'; busy: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void; onStatusChange: (status: TaskStatus, comment: string) => Promise<void> }) {
  const [comment, setComment] = useState('')
  const [validationError, setValidationError] = useState('')
  const actions = getAvailableTaskActions(task.statusCode, role)
  async function applyAction(status: TaskStatus) {
    if (status === 'rework' && !comment.trim()) {
      setValidationError('Добавьте комментарий для возврата на доработку')
      return
    }
    await onStatusChange(status, comment.trim())
  }
  return <Modal title="Карточка задачи" onClose={onClose}><div className="task-detail"><div className="task-detail-heading"><div><p className="eyebrow">Задача</p><h2>{task.title}</h2></div><div className="task-heading-actions">{role === 'manager' && <><button className="modal-action" type="button" onClick={onEdit}><Pencil size={15} />Изменить</button><button className="modal-action danger-link" type="button" onClick={onDelete}><Trash2 size={15} />Удалить</button></>}<span className={`status-pill ${statusClass[task.status]}`}>{task.status}</span></div></div><div className="detail-grid"><DetailItem icon={<Building2 size={15} />} label="Объект" value={task.object} /><DetailItem icon={<UserRound size={15} />} label="Исполнитель" value={task.assignee} /></div><div className="description-block"><span>Описание</span><p>{task.description || 'Описание не добавлено'}</p></div>{actions.length > 0 && <div className="task-action"><div className="task-action-copy"><strong>Доступные действия</strong><span>{actions[0].hint}</span></div>{actions.some((item) => item.status === 'rework') && <textarea value={comment} onChange={(event) => { setComment(event.target.value); setValidationError('') }} placeholder="Комментарий для доработки" rows={3} />}{validationError && <p className="form-error">{validationError}</p>}<div className="action-buttons">{actions.map((action) => <button className={`primary-button ${action.status === 'rework' ? 'danger-button' : ''}`} type="button" key={action.status} onClick={() => void applyAction(action.status)} disabled={busy}>{busy ? 'Сохраняем...' : action.label}</button>)}</div></div>}<div className="history-block"><div className="history-heading"><History size={16} /><strong>История изменений</strong></div>{history.length ? history.map((item) => <div className="history-item" key={item.id}><span className="history-dot" /><div><strong>{item.changedBy}</strong><span>{item.fromStatus ? statusLabels[item.fromStatus] : 'Создание'} → {statusLabels[item.toStatus]} · {item.changedAt}</span>{item.comment && <p>{item.comment}</p>}</div></div>) : <p className="empty-history">Изменений статуса пока нет</p>}</div></div></Modal>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><section className="modal-card" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть"><X size={18} /></button></div>{children}</section></div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>
}

function FormActions({ busy, onClose, submitLabel }: { busy: boolean; onClose: () => void; submitLabel: string }) {
  return <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Сохраняем...' : submitLabel}</button></div>
}

function DetailItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="detail-item"><span>{icon}{label}</span><strong>{value}</strong></div>
}

type NavItemProps = { icon: ReactNode; label: string; active: boolean; onClick: () => void }

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return <button className={`nav-item ${active ? 'nav-item-active' : ''}`} onClick={onClick} type="button">{icon}<span>{label}</span></button>
}

type SummaryCardProps = { icon: ReactNode; label: string; value: string; note: string; tone: 'blue' | 'violet' | 'green' }

function SummaryCard({ icon, label, value, note, tone }: SummaryCardProps) {
  return <article className="summary-card"><div className={`summary-icon summary-icon-${tone}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong><span>{note}</span></div></article>
}

export default App
