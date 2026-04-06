import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const IDENTITY_PRESETS = ['爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆', '月嫂', '其他']

export function JoinPage() {
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loginKey, setLoginKey] = useState('')
  const [identityTag, setIdentityTag] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api<{ token: string }>('/api/join', {
        method: 'POST',
        body: JSON.stringify({
          inviteCode,
          displayName,
          loginKey,
          password,
          identityTag: identityTag || undefined,
        }),
      })
      await loginWithToken(res.token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <h1>加入家庭</h1>
      <p className="muted">向管理员索取 6 位邀请码，再为自己设定登录代号。</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          邀请码
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} />
        </label>
        <label>
          显示昵称
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label>
          登录代号
          <input value={loginKey} onChange={(e) => setLoginKey(e.target.value)} placeholder="仅此家庭内唯一" />
        </label>
        <label>
          家庭身份（可选）
          <select value={identityTag} onChange={(e) => setIdentityTag(e.target.value)}>
            <option value="">不指定</option>
            {IDENTITY_PRESETS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label>
          密码（至少 6 位）
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? '加入中…' : '加入家庭'}
        </button>
      </form>
      <p className="footer-links">
        <Link to="/login">返回登录</Link>
      </p>
    </div>
  )
}
