import { useMemo, useState } from 'react'
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
  UserRound,
} from 'lucide-react'

type TaskStatus = 'Новая' | 'В работе' | 'На проверке' | 'Принята' | 'На доработке'

type Task = {
  id: number
  title: string
  object: string
  assignee: string
  status: TaskStatus
  createdAt: string
}

const tasks: Task[] = [
  {
    id: 1,
    title: 'Подготовить чертежи лестницы',
    object: 'ЖК «Северный парк»',
    assignee: 'Иван Петров',
    status: 'На проверке',
    createdAt: 'Сегодня, 09:42',
  },
  {
    id: 2,
    title: 'Проверить поставку окон',
    object: 'Коттедж на Лесной',
    assignee: 'Анна Смирнова',
    status: 'В работе',
    createdAt: 'Вчера, 16:20',
  },
  {
    id: 3,
    title: 'Согласовать цвет фасада',
    object: 'ЖК «Северный парк»',
    assignee: 'Иван Петров',
    status: 'Новая',
    createdAt: 'Вчера, 11:05',
  },
  {
    id: 4,
    title: 'Принять исполнительную документацию',
    object: 'Офисный центр «Маяк»',
    assignee: 'Анна Смирнова',
    status: 'Принята',
    createdAt: '12 ноября, 14:10',
  },
]

const statusClass: Record<TaskStatus, string> = {
  Новая: 'status-new',
  'В работе': 'status-progress',
  'На проверке': 'status-review',
  Принята: 'status-done',
  'На доработке': 'status-rework',
}

function App() {
  const [activeSection, setActiveSection] = useState('Обзор')
  const [search, setSearch] = useState('')

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return tasks

    return tasks.filter((task) =>
      [task.title, task.object, task.assignee, task.status]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">ОТ</div>
          <div>
            <strong>Объекты</strong>
            <span>и задачи</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Основная навигация">
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Обзор"
            active={activeSection === 'Обзор'}
            onClick={() => setActiveSection('Обзор')}
          />
          <NavItem
            icon={<Building2 size={18} />}
            label="Объекты"
            active={activeSection === 'Объекты'}
            onClick={() => setActiveSection('Объекты')}
          />
          <NavItem
            icon={<ClipboardList size={18} />}
            label="Мои задачи"
            active={activeSection === 'Мои задачи'}
            onClick={() => setActiveSection('Мои задачи')}
          />
        </nav>

        <div className="sidebar-footer">
          <NavItem
            icon={<Settings size={18} />}
            label="Настройки"
            active={activeSection === 'Настройки'}
            onClick={() => setActiveSection('Настройки')}
          />
          <button className="profile-card" type="button">
            <span className="avatar avatar-blue">АК</span>
            <span className="profile-copy">
              <strong>Алексей Кузнецов</strong>
              <small>Постановщик</small>
            </span>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Среда, 13 ноября</p>
            <h1>{activeSection}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Выйти">
              <LogOut size={18} />
            </button>
            <button className="user-chip" type="button">
              <span className="avatar avatar-blue">АК</span>
              <span>Алексей</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        <section className="page-content">
          <div className="summary-grid">
            <SummaryCard icon={<Building2 size={20} />} label="Всего объектов" value="12" note="2 добавлено в этом месяце" tone="blue" />
            <SummaryCard icon={<ClipboardList size={20} />} label="Всего задач" value="48" note="8 задач требуют внимания" tone="violet" />
            <SummaryCard icon={<CheckCircle2 size={20} />} label="Выполнено" value="31" note="65% от всех задач" tone="green" />
          </div>

          <section className="panel tasks-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Рабочий список</p>
                <h2>Последние задачи</h2>
              </div>
              <button className="primary-button" type="button">
                <Plus size={17} />
                Новая задача
              </button>
            </div>

            <div className="table-toolbar">
              <label className="search-field">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Поиск по задачам"
                />
              </label>
              <button className="filter-button" type="button">
                Все статусы
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Задача</th>
                    <th>Объект</th>
                    <th>Исполнитель</th>
                    <th>Статус</th>
                    <th>Создана</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <button className="task-link" type="button">{task.title}</button>
                      </td>
                      <td className="muted-cell">{task.object}</td>
                      <td>
                        <span className="assignee-cell">
                          <span className="avatar avatar-small">{task.assignee.split(' ').map((name) => name[0]).join('')}</span>
                          {task.assignee}
                        </span>
                      </td>
                      <td><span className={`status-pill ${statusClass[task.status]}`}>{task.status}</span></td>
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

type NavItemProps = {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button className={`nav-item ${active ? 'nav-item-active' : ''}`} onClick={onClick} type="button">
      {icon}
      <span>{label}</span>
    </button>
  )
}

type SummaryCardProps = {
  icon: React.ReactNode
  label: string
  value: string
  note: string
  tone: 'blue' | 'violet' | 'green'
}

function SummaryCard({ icon, label, value, note, tone }: SummaryCardProps) {
  return (
    <article className="summary-card">
      <div className={`summary-icon summary-icon-${tone}`}>{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </article>
  )
}

export default App
