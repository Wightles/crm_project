import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
} from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import { getProfile, loadDashboardData, signIn, signOut, type DashboardTask } from './lib/crm'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Profile } from './types'

const demoTasks: DashboardTask[] = [
  { id: '1', title: 'Подготовить чертежи лестницы', object: 'ЖК «Северный парк»', assignee: 'Иван Петров', status: 'На проверке', createdAt: 'Сегодня, 09:42' },
  { id: '2', title: 'Проверить поставку окон', object: 'Коттедж на Лесной', assignee: 'Анна Смирнова', status: 'В работе', createdAt: 'Вчера, 16:20' },
  { id: '3', title: 'Согласовать цвет фасада', object: 'ЖК «Северный парк»', assignee: 'Иван Петров', status: 'Новая', createdAt: 'Вчера, 11:05' },
  { id: '4', title: 'Принять исполнительную документацию', object: 'Офисный центр «Маяк»', assignee: 'Анна Смирнова', status: 'Принята', createdAt: '12 ноября, 14:10' },
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
  const [liveTasks, setLiveTasks] = useState<DashboardTask[]>([])
  const [objectCount, setObjectCount] = useState(12)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authBusy, setAuthBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    let mounted = true
    const loadUserData = async (userId: string) => {
      try {
        const [nextProfile, dashboard] = await Promise.all([getProfile(userId), loadDashboardData()])
        if (!mounted) return
        setProfile(nextProfile)
        setLiveTasks(dashboard.tasks)
        setObjectCount(dashboard.objectCount)
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
        setLiveTasks([])
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

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

  const tasks = isSupabaseConfigured && session ? liveTasks : demoTasks
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return tasks

    return tasks.filter((task) =>
      [task.title, task.object, task.assignee, task.status]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search, tasks])

  if (isSupabaseConfigured && loading) {
    return <main className="loading-page"><div className="loading-indicator">Загружаем рабочее пространство...</div></main>
  }

  if (isSupabaseConfigured && !session) {
    return <AuthScreen busy={authBusy} error={error} onSubmit={handleSignIn} />
  }

  const userName = profile?.full_name ?? 'Алексей Кузнецов'
  const userRole = profile?.role === 'executor' ? 'Исполнитель' : 'Постановщик'
  const initials = userName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const completedCount = tasks.filter((task) => task.status === 'Принята').length

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">ОТ</div>
          <div><strong>Объекты</strong><span>и задачи</span></div>
        </div>

        <nav className="main-nav" aria-label="Основная навигация">
          <NavItem icon={<LayoutDashboard size={18} />} label="Обзор" active={activeSection === 'Обзор'} onClick={() => setActiveSection('Обзор')} />
          <NavItem icon={<Building2 size={18} />} label="Объекты" active={activeSection === 'Объекты'} onClick={() => setActiveSection('Объекты')} />
          <NavItem icon={<ClipboardList size={18} />} label="Мои задачи" active={activeSection === 'Мои задачи'} onClick={() => setActiveSection('Мои задачи')} />
        </nav>

        <div className="sidebar-footer">
          <NavItem icon={<Settings size={18} />} label="Настройки" active={activeSection === 'Настройки'} onClick={() => setActiveSection('Настройки')} />
          <button className="profile-card" type="button">
            <span className="avatar avatar-blue">{initials}</span>
            <span className="profile-copy"><strong>{userName}</strong><small>{userRole}</small></span>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><p className="eyebrow">Рабочее пространство</p><h1>{activeSection}</h1></div>
          <div className="topbar-actions">
            {error && <span className="topbar-error">{error}</span>}
            <button className="icon-button" type="button" aria-label="Выйти" onClick={() => void handleSignOut()}><LogOut size={18} /></button>
            <button className="user-chip" type="button"><span className="avatar avatar-blue">{initials}</span><span>{userName.split(' ')[0]}</span><ChevronDown size={16} /></button>
          </div>
        </header>

        <section className="page-content">
          <div className="summary-grid">
            <SummaryCard icon={<Building2 size={20} />} label="Всего объектов" value={String(objectCount)} note={isSupabaseConfigured ? 'Доступные вам объекты' : '2 добавлено в этом месяце'} tone="blue" />
            <SummaryCard icon={<ClipboardList size={20} />} label="Всего задач" value={String(tasks.length)} note="Задачи из рабочего списка" tone="violet" />
            <SummaryCard icon={<CheckCircle2 size={20} />} label="Выполнено" value={String(completedCount)} note={tasks.length ? `${Math.round((completedCount / tasks.length) * 100)}% от списка` : 'Пока нет задач'} tone="green" />
          </div>

          <section className="panel tasks-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">Рабочий список</p><h2>Последние задачи</h2></div>
              <button className="primary-button" type="button"><Plus size={17} />Новая задача</button>
            </div>

            <div className="table-toolbar">
              <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по задачам" /></label>
              <button className="filter-button" type="button">Все статусы<ChevronDown size={16} /></button>
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr><th>Задача</th><th>Объект</th><th>Исполнитель</th><th>Статус</th><th>Создана</th></tr></thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id}>
                      <td><button className="task-link" type="button">{task.title}</button></td>
                      <td className="muted-cell">{task.object}</td>
                      <td><span className="assignee-cell"><span className="avatar avatar-small">{task.assignee.split(' ').map((name) => name[0]).join('')}</span>{task.assignee}</span></td>
                      <td><span className={`status-pill ${statusClass[task.status] ?? 'status-new'}`}>{task.status}</span></td>
                      <td className="muted-cell">{task.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}

function getAuthErrorMessage(message: string) {
  if (message.toLowerCase().includes('invalid login credentials')) return 'Неверный email или пароль'
  if (message.toLowerCase().includes('email not confirmed')) return 'Email пользователя ещё не подтверждён'
  return message
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
