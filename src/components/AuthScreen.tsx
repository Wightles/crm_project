import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'

type AuthScreenProps = {
  busy: boolean
  error: string | null
  onSubmit: (email: string, password: string) => Promise<void>
}

function AuthScreen({ busy, error, onSubmit }: AuthScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit(email.trim(), password)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">ОТ</div>
          <div><strong>Объекты</strong><span>и задачи</span></div>
        </div>
        <p className="eyebrow">Рабочее пространство</p>
        <h1>Вход в систему</h1>
        <p className="auth-description">Войдите, чтобы увидеть объекты и задачи вашей команды.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <div className="input-with-icon">
              <Mail size={17} />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.ru" autoComplete="email" required />
            </div>
          </label>
          <label>
            <span>Пароль</span>
            <div className="input-with-icon">
              <LockKeyhole size={17} />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Введите пароль" autoComplete="current-password" required />
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? 'Проверяем...' : 'Войти'}
            {!busy && <ArrowRight size={17} />}
          </button>
        </form>
      </section>
    </main>
  )
}

export default AuthScreen
