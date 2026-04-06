import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [loginKey, setLoginKey] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api<{ token: string }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ inviteCode, loginKey, password }),
      })
      await loginWithToken(res.token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <h1>登录</h1>
      <p className="muted">使用家庭邀请码与个人登录代号，全员独立账号。</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          邀请码
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} autoCapitalize="characters" />
        </label>
        <label>
          登录代号
          <input value={loginKey} onChange={(e) => setLoginKey(e.target.value)} placeholder="例如 mom、dad" />
        </label>
        <label>
          密码
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? '登录中…' : '进入家庭'}
        </button>
      </form>
      <p className="footer-links">
        <Link to="/register">创建家庭</Link>
        <span className="dot">·</span>
        <Link to="/join">加入家庭</Link>
      </p>
    </div>
  )
}
