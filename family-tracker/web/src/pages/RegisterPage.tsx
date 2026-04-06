import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()
  const [familyName, setFamilyName] = useState('')
  const [babyName, setBabyName] = useState('')
  const [adminDisplayName, setAdminDisplayName] = useState('')
  const [adminLoginKey, setAdminLoginKey] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api<{ token: string; inviteCode: string }>('/api/register-family', {
        method: 'POST',
        body: JSON.stringify({
          familyName,
          babyName: babyName || undefined,
          adminDisplayName,
          adminLoginKey,
          password,
        }),
      })
      await loginWithToken(res.token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <h1>创建家庭</h1>
      <p className="muted">你是第一个管理员，之后把邀请码发给家人即可加入。</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          家庭名称
          <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="例如 小家" />
        </label>
        <label>
          宝宝昵称（可选）
          <input value={babyName} onChange={(e) => setBabyName(e.target.value)} placeholder="默认「宝宝」" />
        </label>
        <label>
          你的显示昵称
          <input value={adminDisplayName} onChange={(e) => setAdminDisplayName(e.target.value)} />
        </label>
        <label>
          你的登录代号
          <input value={adminLoginKey} onChange={(e) => setAdminLoginKey(e.target.value)} placeholder="仅此家庭内唯一，如 admin" />
        </label>
        <label>
          密码（至少 6 位）
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? '创建中…' : '创建并开始记录'}
        </button>
      </form>
      <p className="footer-links">
        <Link to="/login">已有账号</Link>
      </p>
    </div>
  )
}
